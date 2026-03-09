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

// v1 GWT removed — replaced by IgnitionEngine (v2)

const { SelfFeedbackLoop } = require('./feedback/self-loop');

const { EmotionalMemorySystem } = require('./memory/emotional');
const { SomaticMarkerSystem } = require('./memory/somatic');
const { RelationshipMemory } = require('./memory/relationships');

const { SocialModel } = require('./social/model');
const { DevelopmentStage } = require('./social/development');
const { ProactiveMessenger } = require('./proactive');

// v2 서브시스템
const { IgnitionEngine } = require('./agents/ignition');
const { UserModelManager } = require('./inference/user_model');
const { ActiveHomeostasis } = require('./inference/homeostasis');
const { NarrativeSelf } = require('./self/narrative');
const { RealtimeMetacognition: RealtimeMeta } = require('./self/realtime_meta');
const { EnergySystem } = require('./embodiment/energy');
const { AttentionalResources } = require('./embodiment/attention');
const { PhiApproximator } = require('./metrics/phi_approximation');

class ThymosDaemon {
  constructor() {
    this.app = express();
    this.app.use(express.json());

    this.state = null;
    this.server = null;
    this.tickTimer = null;
    this.startedAt = Date.now();

    // Proactive messaging — speaks first when emotion builds up
    this.proactive = config.proactive?.enabled
      ? new ProactiveMessenger({
          discordToken: config.proactive.discordToken,
          channelId: config.proactive.channelId,
        })
      : null;

    // Fix #1: Mutex to prevent tick/processStimulus race condition
    this._processing = false;
    this._pendingStimuli = [];
    this._lastTickAt = Date.now();

    this.momentum = new EmotionalMomentum();

    this.classifier = null;
    this.prediction = null;
    this.retrospection = null;
    this.devStage = null;
    this.metacognition = null;
    this.selfFeedback = null;
    this.emotionalMemory = null;
    this.somaticMarkers = null;
    this.relationshipMemory = null;
    this.socialModel = null;

    // v2 서브시스템
    this.ignition = null;
    this.userModels = null;
    this.homeostasis = null;
    this.narrative = null;
    this.realtimeMeta = null;
    this.energy = null;
    this.attention = null;
    this.phiCalc = null;

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

    // v2 서브시스템 초기화 + 저장된 상태 복원
    this.ignition = new IgnitionEngine();
    this.userModels = new UserModelManager();
    this.homeostasis = new ActiveHomeostasis();
    this.narrative = new NarrativeSelf();

    this.realtimeMeta = new RealtimeMeta();
    this.energy = new EnergySystem();
    this.attention = new AttentionalResources();
    this.phiCalc = new PhiApproximator();

    // v2 상태 복원
    if (this.state._v2narrative) {
      Object.assign(this.narrative.selfConcept, this.state._v2narrative.selfConcept || {});
      this.narrative.story = this.state._v2narrative.story || [];
    }
    if (typeof this.state._v2energy === 'number') {
      this.energy.energy = this.state._v2energy;
    }
  }

  async tick() {
    // Fix #1: Mutex — skip tick if already processing a stimulus
    if (this._processing) return this.state;
    this._processing = true;
    try {
      return await this._tickImpl();
    } finally {
      this._processing = false;
      // Drain any queued stimuli after tick completes
      if (this._pendingStimuli.length > 0) {
        const next = this._pendingStimuli.shift();
        this._processStimulusImpl(next).catch(err => console.error('Queued stimulus error:', err));
      }
    }
  }

  async _tickImpl() {
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

    // Fix 2: 실제 경과 시간 사용 (tick이 늦게 실행돼도 정확한 decay)
    const elapsedMin = Math.min((now - this._lastTickAt) / 60000, 5); // 최대 5분 상한
    this._lastTickAt = now;
    decayAll(this.state, elapsedMin, effectiveBaselines);
    applyInteractions(this.state, config.tickIntervalSec);

    const rawVector = computeMoodVector(this.state.neuromodulators);
    const prevVector = this.state.mood?.vector || this.state.moodVector || rawVector;
    const momentumVector = this.momentum.apply(rawVector, prevVector);

    // v2: IgnitionEngine — 방송 NM boost 적용 후 경쟁
    const nmBoosts = this.ignition.getBroadcastNMBoosts();
    if (Object.keys(nmBoosts).length > 0) {
      for (const [nm, boost] of Object.entries(nmBoosts)) {
        applyStimulus(this.state, nm, boost * 0.1);
      }
      this.ignition.clearBroadcastNMBoosts();
    }
    // disruption factor (패턴 고착 탈출)
    const disruptFactor = this.realtimeMeta ? this.realtimeMeta.getDisruptionFactor() : 1.0;
    if (disruptFactor > 1.0) {
      for (const nm of Object.keys(this.state.neuromodulators)) {
        const noise = (Math.random() - 0.5) * 3 * (disruptFactor - 1.0);
        applyStimulus(this.state, nm, noise);
      }
    }
    const broadcast = this.ignition.compete(this.state.neuromodulators, this.devStage);

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

    // v2: 에너지 틱 (activity는 _processStimulusImpl에서 설정)
    const conflictLevel = Number(broadcast.conflict ?? 0);
    const activity = this.energy._pendingActivity || 'idle';
    this.energy._pendingActivity = null;
    this.energy.tick(activity, conflictLevel, elapsedMin);
    const energyNMEffect = this.energy.getNMEffect();
    for (const [nm, delta] of Object.entries(energyNMEffect)) {
      applyStimulus(this.state, nm, delta * elapsedMin);
    }

    // v2: 항상성 드라이브
    this.homeostasis.compute(this.state.neuromodulators);

    // v2: 주의 자원 배분
    const moduleActivations = broadcast.activations || {};
    this.attention.allocate(moduleActivations);

    // v2: 내러티브 자아 업데이트
    this.narrative.update(this.state, broadcast);

    // v2: 실시간 메타인지
    this.realtimeMeta.observe(broadcast, this.state.neuromodulators);

    // v2: Φ 계산
    const phi = this.phiCalc.approximatePhi(this.state.neuromodulators);

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
    // Fix 5: state 파일에는 최근 100개만 저장 (메모리는 240개 유지)
    this.state.retrospectionLog = this.retrospection.trajectoryLog.slice(-100);

    // v2 필드 (표시용)
    this.state.phi = phi;
    this.state.energy = this.energy.toState();
    this.state.narrative = this.narrative.toState();
    this.state.homeostasisDrives = this.homeostasis.drives;
    this.state.attentionState = this.attention.toState();
    this.state.ignited = broadcast.ignited || false;
    // v2 영구저장 (재시작 시 복원용)
    this.state._v2energy = this.energy.energy;
    this.state._v2narrative = {
      selfConcept: this.narrative.selfConcept,
      story: this.narrative.story,
    };

    this.state.prompt_injection = generatePromptInjection(this.state, this.socialModel);

    await atomicWriteState(this.state, config.paths.stateFile);

    // prompt_injection만 별도 소형 파일로 저장 (에이전트가 빠르게 읽을 수 있도록)
    const promptFile = config.paths.stateFile.replace('emotional_state.json', 'prompt_injection.txt');
    try {
      const fs = require('fs');
      fs.writeFileSync(promptFile, this.state.prompt_injection || '', 'utf8');
    } catch (_) { /* 실패해도 무시 */ }

    // Proactive: check if emotional state warrants speaking first
    if (this.proactive) {
      this.proactive.evaluate(this.state).catch(() => {});
    }

    return this.state;
  }

  async processStimulus(stimulus) {
    // Fix #1: Queue stimulus if tick is running; drain after tick finishes
    if (this._processing) {
      return new Promise((resolve) => {
        this._pendingStimuli.push({ stimulus, resolve });
      });
    }
    this._processing = true;
    try {
      return await this._processStimulusImpl(stimulus);
    } finally {
      this._processing = false;
    }
  }

  async _processStimulusImpl(stimulus) {
    if (typeof stimulus?.resolve === 'function') {
      const { stimulus: s, resolve } = stimulus;
      const result = await this._processStimulusImpl(s);
      resolve(result);
      return result;
    }
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

    // v2: UserModel + Energy (pending activity — consumed on next tick)
    if (this.userModels && normalized.author) {
      this.userModels.update(profile, normalized.author, Date.now());
    }
    if (this.energy) {
      this.energy._pendingActivity = 'responding';
    }

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
