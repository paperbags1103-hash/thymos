const express = require('express');
const config = require('./utils/config');
const { readStateWithRecovery, createInitialState } = require('./io/state');
const { atomicWriteState } = require('./io/atomic-write');
const { generatePromptInjection } = require('./io/prompt');
const {
  applyStimulus,
  processPendingCortisol,
  decayAll,
  getEffectiveBaseline,
} = require('./engine/neuromodulators');
const { applyInteractions } = require('./engine/interactions');
const { getCircadianModifiers } = require('./engine/circadian');
const { computeMoodVector, vectorToLabel, EmotionalMomentum } = require('./feedback/mood-vector');

class ThymosDaemon {
  constructor() {
    this.app = express();
    this.app.use(express.json());

    this.state = null;
    this.server = null;
    this.tickTimer = null;
    this.momentum = new EmotionalMomentum();

    this.setupRoutes();
  }

  async start() {
    this.state = await readStateWithRecovery(config.paths.stateFile);
    if (!this.state || !this.state.neuromodulators) {
      this.state = createInitialState();
    }

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

  async tick() {
    if (!this.state) this.state = createInitialState();

    processPendingCortisol(this.state);

    const hour = new Date().getHours();
    const circadianMods = getCircadianModifiers(hour);
    const effectiveBaselines = {};

    for (const [name, cfg] of Object.entries(config.neuromodulatorConfigs)) {
      effectiveBaselines[name] = getEffectiveBaseline(cfg, circadianMods[name], 0, 0);
    }

    const elapsedMin = config.tickInterval / 60000;
    decayAll(this.state, elapsedMin, effectiveBaselines);
    applyInteractions(this.state, config.tickIntervalSec);

    const rawVector = computeMoodVector(this.state.neuromodulators);
    const prevVector = this.state.mood?.vector || this.state.moodVector || rawVector;
    const momentumVector = this.momentum.apply(rawVector, prevVector);
    const moodLabel = vectorToLabel(momentumVector);

    this.state.moodVector = momentumVector;
    this.state.moodLabel = moodLabel;
    this.state.mood = {
      vector: momentumVector,
      label: moodLabel.label,
      labelConfidence: moodLabel.confidence,
      momentum: this.momentum.momentum,
    };
    this.state.circadian = {
      period: this._getPeriodName(hour),
      hour,
    };
    this.state.drive = `${moodLabel.label} regulation`;
    this.state.prompt_injection = generatePromptInjection(this.state);

    await atomicWriteState(this.state, config.paths.stateFile);
    return this.state;
  }

  _classifyStimulus(stimulus) {
    const content = String(stimulus.content || '').toLowerCase();
    const subtype = String(stimulus.subtype || '').toLowerCase();

    if (subtype.includes('error') || content.includes('error') || content.includes('failed')) {
      return 'error';
    }

    if (
      subtype.includes('praise') ||
      content.includes('good job') ||
      content.includes('great') ||
      content.includes('well done') ||
      content.includes('nice work')
    ) {
      return 'praise';
    }

    if (
      subtype.includes('criticism') ||
      content.includes('bad') ||
      content.includes('disappoint') ||
      content.includes('wrong') ||
      content.includes('not good')
    ) {
      return 'criticism';
    }

    return 'neutral';
  }

  _deltasForCategory(category) {
    if (category === 'praise') return { dopamine: +12, oxytocin: +10 };
    if (category === 'criticism') return { cortisol: +16, serotonin: -8 };
    if (category === 'error') return { cortisol: +14, norepinephrine: +10 };
    return { serotonin: +2 };
  }

  setupRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ ok: true, service: 'thymos', tickInterval: config.tickInterval });
    });

    this.app.get('/state', (_req, res) => {
      if (!this.state) return res.status(503).json({ ok: false, error: 'not_started' });
      return res.json(this.state);
    });

    this.app.get('/prompt', (_req, res) => {
      if (!this.state) return res.status(503).json({ ok: false, error: 'not_started' });
      return res.type('text/plain').send(this.state.prompt_injection || generatePromptInjection(this.state));
    });

    this.app.post('/webhook/stimulus', async (req, res) => {
      try {
        if (!this.state) {
          this.state = await readStateWithRecovery(config.paths.stateFile);
        }

        const stimulus = req.body || {};
        const category = this._classifyStimulus(stimulus);
        const deltas = this._deltasForCategory(category);

        for (const [nmName, delta] of Object.entries(deltas)) {
          applyStimulus(this.state, nmName, delta);
        }

        this.state.totalInteractions = (this.state.totalInteractions || 0) + 1;
        await this.tick();

        return res.json({ ok: true, category, deltas });
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    });
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
