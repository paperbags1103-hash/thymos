const { addNoise, clamp, decay, hillResponse } = require('../utils/math');
const config = require('../utils/config');

function getEffectiveBaseline(neuromodConfig, circadianMod, relationshipBonus, retrospectionMod) {
  return clamp(
    neuromodConfig.baseline + (circadianMod || 0) + (relationshipBonus || 0) + (retrospectionMod || 0),
    5,
    95
  );
}

function applyStimulus(state, neuromodName, rawDelta) {
  const nmCfg = config.neuromodulatorConfigs[neuromodName];
  if (!nmCfg || !state.neuromodulators[neuromodName]) return;

  const delta = hillResponse(rawDelta, nmCfg.EC50, nmCfg.hillN, nmCfg.Emax);

  if (neuromodName === 'cortisol') {
    const delayMs = (15 + Math.random() * 15) * 60 * 1000;
    state.neuromodulators.cortisol.pending.push({
      delta,
      activateAt: Date.now() + delayMs,
      source: 'hpa_axis',
    });
    return;
  }

  const noisyDelta = addNoise(delta, config.noiseBaseFraction);
  state.neuromodulators[neuromodName].value = clamp(
    state.neuromodulators[neuromodName].value + noisyDelta,
    0,
    100
  );
}

function processPendingCortisol(state) {
  const now = Date.now();
  const pending = state.neuromodulators.cortisol.pending || [];
  const ready = pending.filter((p) => p.activateAt <= now);
  const notReady = pending.filter((p) => p.activateAt > now);

  for (const p of ready) {
    state.neuromodulators.cortisol.value = clamp(state.neuromodulators.cortisol.value + p.delta, 0, 100);
  }

  state.neuromodulators.cortisol.pending = notReady;
}

function decayAll(state, elapsedMin, effectiveBaselines) {
  for (const [name, nmState] of Object.entries(state.neuromodulators)) {
    const cfg = config.neuromodulatorConfigs[name];
    const baseline = typeof effectiveBaselines[name] === 'number' ? effectiveBaselines[name] : cfg.baseline;
    nmState.value = clamp(decay(nmState.value, baseline, cfg.tau, elapsedMin), 0, 100);
  }
}

module.exports = {
  applyStimulus,
  processPendingCortisol,
  decayAll,
  getEffectiveBaseline,
};
