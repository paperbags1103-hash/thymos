const fs = require('fs');
const config = require('../utils/config');
const { clamp, decay } = require('../utils/math');

function createInitialState() {
  const now = Date.now();

  return {
    version: 0,
    last_updated: now,
    createdAt: now,
    totalInteractions: 0,

    neuromodulators: {
      dopamine: { value: 50, pending: [] },
      cortisol: { value: 20, pending: [] },
      serotonin: { value: 60, pending: [] },
      oxytocin: { value: 40, pending: [] },
      norepinephrine: { value: 30, pending: [] },
      gaba: { value: 55, pending: [] },
      acetylcholine: { value: 45, pending: [] },
    },

    moodVector: { valence: 0, arousal: 0, dominance: 0, sociality: 0 },
    moodLabel: { label: 'neutral', confidence: 1.0, distance: 0 },
    mood: {
      vector: { valence: 0, arousal: 0, dominance: 0, sociality: 0 },
      label: 'neutral',
      labelConfidence: 1.0,
      momentum: 0,
    },

    prediction: {
      uncertaintyLevel: 0.5,
      lastSurprise: 0,
      lastSurpriseType: 'neutral',
    },

    emotionalMemories: [],
    somaticMarkers: [],
    socialModel: {},
    retrospectionLog: [],

    gwt: null,
    metacognition: null,
    selfAwareness: null,

    developmentStage: 'infant',
    development: {
      stage: 'infant',
      label: '유아기',
      totalInteractions: 0,
      daysSinceCreation: 0,
    },

    prompt_injection:
      '[Thymos State]\nMood: neutral (V:+0.00 A:+0.00 D:+0.00 S:+0.00)\nDrive: stable baseline',
  };
}

function applyElapsedDecay(state, elapsedMin) {
  const now = Date.now();

  for (const [name, nm] of Object.entries(state.neuromodulators || {})) {
    const nmCfg = config.neuromodulatorConfigs[name];
    if (!nmCfg) continue;

    nm.value = clamp(decay(Number(nm.value || nmCfg.baseline), nmCfg.baseline, nmCfg.tau, elapsedMin), 0, 100);
    nm.pending = (nm.pending || []).filter((item) => item.activateAt > now);
  }

  state.last_updated = now;
  return state;
}

function ensureStateShape(state) {
  const base = createInitialState();
  const merged = {
    ...base,
    ...state,
    neuromodulators: {
      ...base.neuromodulators,
      ...(state.neuromodulators || {}),
    },
    moodVector: {
      ...base.moodVector,
      ...(state.moodVector || state.mood?.vector || {}),
    },
    moodLabel: {
      ...base.moodLabel,
      ...(state.moodLabel || {}),
    },
    mood: {
      ...base.mood,
      ...(state.mood || {}),
      vector: {
        ...base.mood.vector,
        ...(state.mood?.vector || state.moodVector || {}),
      },
    },
    prediction: {
      ...base.prediction,
      ...(state.prediction || {}),
    },
    development: {
      ...base.development,
      ...(state.development || {}),
    },
  };

  for (const [name, nmBase] of Object.entries(base.neuromodulators)) {
    const current = merged.neuromodulators[name] || nmBase;
    merged.neuromodulators[name] = {
      value: clamp(Number(current.value ?? nmBase.value), 0, 100),
      pending: Array.isArray(current.pending) ? current.pending : [],
    };
  }

  return merged;
}

async function readStateWithRecovery(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const state = ensureStateShape(parsed);

    const now = Date.now();
    const elapsedMin = (now - (state.last_updated || now)) / 60000;
    if (elapsedMin > 1) {
      return applyElapsedDecay(state, elapsedMin);
    }

    return state;
  } catch {
    return createInitialState();
  }
}

module.exports = {
  readStateWithRecovery,
  createInitialState,
  applyElapsedDecay,
  ensureStateShape,
};
