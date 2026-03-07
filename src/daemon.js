const express = require('express');
const config = require('./utils/config');
const { readStateWithRecovery, createInitialState, ensureStateShape } = require('./io/state');
const { atomicWriteState } = require('./io/atomic-write');
const { generatePromptInjection } = require('./io/prompt');
const {
  applyStimulus,
  processPendingCortisol,
  decayAll,
  getEffectiveBaseline,
} = require('./engine/neuromodulators');
const { addNoiseDevelopmental } = require('./engine/noise');
const { applyInteractions } = require('./engine/interactions');
const { getCircadianModifiers } = require('./engine/circadian');
const { computeMoodVector, vectorToLabel, EmotionalMomentum } = require('./feedback/mood-vector');

const { StimulusClassifier, stimulusToNeuromodulators } = require('./cognition/classifier');
const { PredictionEngine } = require('./cognition/prediction');
const { attentionGate } = require('./cognition/attention');
const { MetacognitionLayer } = require('./cognition/metacognition');
const { RetrospectionEngine } = require('./cognition/retrospection');

const { InternalAgents } = require('./agents/internal');
const { globalWorkspaceCompetition } = require('./agents/gwt');

const { SelfFeedbackLoop } = require('./feedback/self-loop');

const { EmotionalMemorySystem } = require('./memory/emotional');
const { SomaticMarkerSystem } = require('./memory/somatic');
const { RelationshipMemory } = require('./memory/relationships');

const { SocialModel } = require('./social/model');
const { DevelopmentStage } = require('./social/development');

class ThymosDaemon {
  constructor() {
    this.app = express();
    this.app.use(express.json());

    this.state = null;
    this.server = null;
    this.tickTimer = null;
    this.startedAt = Date.now();

    this.momentum = new EmotionalMomentum();

    this.classifier = null;
    this.prediction = null;
    this.retrospection = null;
    this.devStage = null;
    this.metacognition = null;
    this.internalAgents = null;
    this.selfFeedback = null;
    this.emotionalMemory = null;
    this.somaticMarkers = null;
    this.relationshipMemory = null;
    this.socialModel = null;

    this.setupRoutes();
  }

  async start() {
    this.state = await readStateWithRecovery(config.paths.stateFile);
    if (!this.state || !this.state.neuromodulators) {
      this.state = createInitialState();
    }

    this.state = ensureStateShape(this.state);
    this._initSubsystems();

    await this.tick();

    this.tickTimer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('Tick failure:', err);
      });
    }, config.tickInterval);

    this.server = this.app.listen(config.webhookPort, () => {
      console.log(`Thymos daemon listening on port ${config.webhookPort}`);
    });

    return this;
  }

  async stop() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }
  }

  _initSubsystems() {
    this.classifier = new StimulusClassifier();
    this.prediction = new PredictionEngine();
    this.retrospection = new RetrospectionEngine(config.retrospectionInterval);
    this.devStage = new DevelopmentStage(this.state);
    this.metacognition = new MetacognitionLayer(this.devStage);
    this.internalAgents = new InternalAgents();
    this.selfFeedback = new SelfFeedbackLoop(this.classifier);
    this.emotionalMemory = new EmotionalMemorySystem();
    this.somaticMarkers = new SomaticMarkerSystem(this.emotionalMemory);
    this.relationshipMemory = new RelationshipMemory();
    this.socialModel = new SocialModel();

    if (Array.isArray(this.state.emotionalMemories)) {
      this.emotionalMemory.memories = this.state.emotionalMemories;
    }

    if (Array.isArray(this.state.somaticMarkers)) {
      this.somaticMarkers.decisionOutcomes = this.state.somaticMarkers;
    }

    if (this.state.socialModel && typeof this.state.socialModel === 'object') {
      this.socialModel.models = this.state.socialModel;
    }

    if (this.state.lastRetrospection?.summary) {
      this.retrospection.lastRetrospection = Date.now();
    }
  }

  async tick() {
    if (!this.state) {
      this.state = createInitialState();
      this._initSubsystems();
    }

    const now = Date.now();

    processPendingCortisol(this.state);

    const hour = new Date(now).getHours();
    const circadianMods = getCircadianModifiers(hour);

    const relationshipBonuses = this.relationshipMemory.getBaselineBonuses(this.state.lastAuthor);
    const retroAdjustments = this.state.lastRetrospection?.adjustments || {};

    const effectiveBaselines = {};
    for (const [name, cfg] of Object.entries(config.neuromodulatorConfigs)) {
      const relationBonus = relationshipBonuses[name] || 0;
      const retroMod = retroAdjustments[`${name}_baseline_mod`] || 0;
      effectiveBaselines[name] = getEffectiveBaseline(cfg, circadianMods[name], relationBonus, retroMod);
    }

    const elapsedMin = config.tickInterval / 60000;
    decayAll(this.state, elapsedMin, effectiveBaselines);
    applyInteractions(this.state, config.tickIntervalSec);

    const rawVector = computeMoodVector(this.state.neuromodulators);
    const prevVector = this.state.mood?.vector || this.state.moodVector || rawVector;
    const momentumVector = this.momentum.apply(rawVector, prevVector);

    const idResp = this.internalAgents.generateIdResponse(this.state.neuromodulators, null);
    const egoResp = this.internalAgents.generateEgoResponse(this.state.neuromodulators, null, {
      isUrgent: false,
      isComplex: false,
    });
    const superegoResp = this.internalAgents.generateSuperegoResponse(this.state.neuromodulators, null);
    const broadcast = globalWorkspaceCompetition(idResp, egoResp, superegoResp, this.devStage);

    const metaResult = this.metacognition.regulate(momentumVector, broadcast, {
      inConversation: this._isInConversation(),
      isGenuineThreat: false,
    });

    const moodLabel = vectorToLabel(metaResult.regulated);

    this.retrospection.logState(metaResult.regulated, moodLabel.label);
    if (this.retrospection.shouldRetrospect()) {
      this.state.lastRetrospection = this.retrospection.retrospect();
    }

    this.emotionalMemory.decayMemories();

    const stage = this.devStage.getStage();

    this.state.moodVector = metaResult.regulated;
    this.state.moodLabel = moodLabel;
    this.state.mood = {
      vector: metaResult.regulated,
      label: moodLabel.label,
      labelConfidence: moodLabel.confidence,
      momentum: this.momentum.momentum,
    };
    this.state.gwt = broadcast;
    this.state.metacognition = {
      regulated: metaResult.appliedRegulations.length > 0,
      appliedRegulations: metaResult.appliedRegulations,
      selfAwareness: metaResult.selfAwareness,
      regulationCapacity: metaResult.regulationCapacity,
    };
    this.state.selfAwareness = metaResult.selfAwareness;
    this.state.developmentStage = stage.name;
    this.state.development = {
      stage: stage.name,
      label: stage.label,
      totalInteractions: this.devStage.totalInteractions,
      daysSinceCreation: (now - this.state.createdAt) / (24 * 60 * 60 * 1000),
    };
    this.state.circadian = {
      period: this._getPeriodName(hour),
      hour,
    };
    this.state.prediction = {
      uncertaintyLevel: this.prediction.uncertaintyLevel,
      lastSurprise: Number(this.state.prediction?.lastSurprise || 0),
      lastSurpriseType: this.state.prediction?.lastSurpriseType || 'neutral',
    };

    this.state.emotionalMemories = this.emotionalMemory.memories;
    this.state.somaticMarkers = this.somaticMarkers.decisionOutcomes;
    this.state.socialModel = this.socialModel.models;
    this.state.relationships = this.relationshipMemory.relationships;
    this.state.retrospectionLog = this.retrospection.trajectoryLog;

    this.state.prompt_injection = generatePromptInjection(this.state, this.socialModel);

    await atomicWriteState(this.state, config.paths.stateFile);
    return this.state;
  }

  async processStimulus(stimulus) {
    const normalized = this._normalizeStimulus(stimulus);

    let profile = this.classifier.classify(normalized);
    profile = attentionGate(profile, this.state.moodVector || { valence: 0, arousal: 0 });

    const predError = this.prediction.processStimulusAndGetError(profile);

    const volatility = this.devStage.getVolatility();

    const stimulusDeltas = stimulusToNeuromodulators(profile);
    const predictionDeltas = this.prediction.predictionErrorToNeuromod(predError);

    const merged = {};
    for (const nmName of Object.keys(this.state.neuromodulators)) {
      const baseDelta = (stimulusDeltas[nmName] || 0) + (predictionDeltas[nmName] || 0);
      merged[nmName] = addNoiseDevelopmental(baseDelta, volatility);
      applyStimulus(this.state, nmName, merged[nmName]);
    }

    const recalls = this.emotionalMemory.recall({
      keywords: normalized.keywords,
      author: normalized.author,
      category: profile.category,
    });

    if (recalls.length > 0) {
      this.state.moodVector = this.emotionalMemory.applyRecalledEmotions(this.state.moodVector, recalls);
    }

    const formedMemory = this.emotionalMemory.maybeFormMemory(profile, this.state.moodVector, predError, {
      keywords: normalized.keywords,
      author: normalized.author,
      neuromodulators: this.state.neuromodulators,
    });

    if (normalized.author) {
      this.socialModel.updateModel(normalized.author, profile);
      this.relationshipMemory.updateRelationship(normalized.author, profile);
      this.state.lastAuthor = normalized.author;
    }

    this.devStage.recordInteraction();
    this.state.totalInteractions = this.devStage.totalInteractions;
    this.state.lastStimulusAt = Date.now();

    this.state.prediction = {
      uncertaintyLevel: predError.uncertaintyLevel,
      lastSurprise: predError.surprise,
      lastSurpriseType: predError.signedSurprise >= 0 ? 'positive' : 'negative',
    };

    await this.tick();

    return {
      classified: profile,
      predictionError: predError,
      deltas: merged,
      recalls,
      formedMemory,
      development: this.devStage.getStage(),
    };
  }

  setupRoutes() {
    this.app.get('/health', (_req, res) => {
      const stage = this.state?.development?.stage || this.state?.developmentStage || 'unknown';
      const moodLabel = this.state?.mood?.label || this.state?.moodLabel?.label || 'neutral';
      res.json({
        ok: true,
        service: 'thymos',
        stage,
        moodLabel,
        uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      });
    });

    this.app.get('/state', (_req, res) => {
      if (!this.state) return res.status(503).json({ ok: false, error: 'not_started' });
      return res.json(this.state);
    });

    this.app.get('/prompt', (_req, res) => {
      if (!this.state) return res.status(503).json({ ok: false, error: 'not_started' });
      return res.type('text/plain').send(this.state.prompt_injection || generatePromptInjection(this.state, this.socialModel));
    });

    this.app.post('/webhook/stimulus', async (req, res) => {
      try {
        if (!this.state) {
          this.state = ensureStateShape(await readStateWithRecovery(config.paths.stateFile));
          this._initSubsystems();
        }

        const result = await this.processStimulus(req.body || {});
        return res.json({ ok: true, result });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    });

    this.app.post('/webhook/self-feedback', async (req, res) => {
      try {
        const output = String(req.body?.output || req.body?.content || '');
        const deltas = this.selfFeedback.processSelfOutput(output);

        for (const [name, delta] of Object.entries(deltas)) {
          applyStimulus(this.state, name, delta);
        }

        await this.tick();
        return res.json({ ok: true, deltas });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    });

    this.app.post('/gut-feeling', (req, res) => {
      try {
        const decision = req.body || {};
        const gut = this.somaticMarkers.getGutFeeling(decision);
        return res.json({ ok: true, gutFeeling: gut });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    });

    this.app.post('/decision-outcome', (req, res) => {
      try {
        const body = req.body || {};
        this.somaticMarkers.recordOutcome(body.decision || {}, body.outcome || {});
        this.state.somaticMarkers = this.somaticMarkers.decisionOutcomes;
        return res.json({ ok: true, count: this.somaticMarkers.decisionOutcomes.length });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    });
  }

  _normalizeStimulus(stimulus) {
    const value = stimulus || {};
    const content = String(value.content || '');

    let type = value.type || 'message';
    if (!value.type && value.subtype) type = 'system';

    return {
      type,
      subtype: value.subtype || '',
      author: value.author || value.user || 'unknown',
      content,
      keywords: Array.isArray(value.keywords)
        ? value.keywords
        : content
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2)
            .slice(0, 8),
      timestamp: value.timestamp || new Date().toISOString(),
    };
  }

  _isInConversation() {
    const last = Number(this.state?.lastStimulusAt || 0);
    if (!last) return false;
    return Date.now() - last < 10 * 60 * 1000;
  }

  _getPeriodName(hour) {
    if (hour >= 6 && hour < 9) return 'wake';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 2) return 'night';
    return 'late_night';
  }
}

if (require.main === module) {
  const daemon = new ThymosDaemon();
  daemon.start().catch((err) => {
    console.error('Failed to start Thymos daemon:', err);
    process.exit(1);
  });
}

module.exports = { ThymosDaemon };
