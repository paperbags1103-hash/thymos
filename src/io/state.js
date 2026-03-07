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
    prompt_injection: '[Thymos State]\nMood: neutral (V:+0.00 A:+0.00 D:+0.00 S:+0.00)\nDrive: stable baseline',
    developmentStage: 'infant',
  };
}

function applyElapsedDecay(state, elapsedMin) {
  const now = Date.now();

  for (const [name, nm] of Object.entries(state.neuromodulators)) {
    const nmCfg = config.neuromodulatorConfigs[name];
    nm.value = clamp(decay(nm.value, nmCfg.baseline, nmCfg.tau, elapsedMin), 0, 100);
    nm.pending = (nm.pending || []).filter((p) => p.activateAt > now);
  }

  state.last_updated = now;
  return state;
}

async function readStateWithRecovery(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const state = JSON.parse(raw);

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
};
