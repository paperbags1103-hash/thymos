const { clamp } = require('../utils/math');
const config = require('../utils/config');

const INTERACTION_MATRIX = {
  dopamine: {
    dopamine: 0,
    cortisol: 0,
    serotonin: +0.02,
    oxytocin: +0.01,
    norepinephrine: +0.03,
    gaba: 0,
    acetylcholine: +0.01,
  },
  cortisol: {
    dopamine: -0.03,
    cortisol: 0,
    serotonin: -0.05,
    oxytocin: -0.02,
    norepinephrine: +0.04,
    gaba: -0.03,
    acetylcholine: -0.02,
  },
  serotonin: {
    dopamine: +0.01,
    cortisol: -0.02,
    serotonin: 0,
    oxytocin: +0.02,
    norepinephrine: -0.01,
    gaba: +0.03,
    acetylcholine: 0,
  },
  oxytocin: {
    dopamine: +0.02,
    cortisol: -0.04,
    serotonin: +0.03,
    oxytocin: 0,
    norepinephrine: -0.01,
    gaba: +0.02,
    acetylcholine: 0,
  },
  norepinephrine: {
    dopamine: +0.02,
    cortisol: +0.02,
    serotonin: -0.02,
    oxytocin: -0.01,
    norepinephrine: 0,
    gaba: -0.04,
    acetylcholine: +0.03,
  },
  gaba: {
    dopamine: -0.01,
    cortisol: -0.03,
    serotonin: +0.02,
    oxytocin: +0.01,
    norepinephrine: -0.05,
    gaba: 0,
    acetylcholine: -0.01,
  },
  acetylcholine: {
    dopamine: +0.02,
    cortisol: 0,
    serotonin: 0,
    oxytocin: 0,
    norepinephrine: +0.02,
    gaba: -0.01,
    acetylcholine: 0,
  },
};

function applyInteractions(state, tickIntervalSec) {
  const interval = typeof tickIntervalSec === 'number' ? tickIntervalSec : 30;
  const tickMin = interval / 60;
  const deltas = {};
  const nm = state.neuromodulators;

  for (const target of Object.keys(INTERACTION_MATRIX)) {
    deltas[target] = 0;
    for (const source of Object.keys(INTERACTION_MATRIX)) {
      if (source === target) continue;
      const sourceBaseline = config.neuromodulatorConfigs[source].baseline;
      const excess = nm[source].value - sourceBaseline;
      const coeff = INTERACTION_MATRIX[source][target];
      deltas[target] += excess * coeff * tickMin;
    }
  }

  for (const [name, delta] of Object.entries(deltas)) {
    nm[name].value = clamp(nm[name].value + delta, 0, 100);
  }
}

module.exports = { INTERACTION_MATRIX, applyInteractions };
