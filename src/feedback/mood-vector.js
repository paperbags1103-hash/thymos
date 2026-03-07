const { clamp } = require('../utils/math');

const EMOTION_PROTOTYPES = {
  serene: [0.6, -0.3, 0.3, 0.2],
  joyful: [0.8, 0.6, 0.5, 0.6],
  excited: [0.5, 0.8, 0.4, 0.3],
  warm: [0.6, 0.0, 0.3, 0.8],
  content: [0.4, -0.2, 0.4, 0.3],
  focused: [0.1, 0.4, 0.6, -0.1],
  curious: [0.3, 0.5, 0.3, 0.2],
  neutral: [0.0, 0.0, 0.0, 0.0],
  bored: [-0.2, -0.5, -0.2, -0.3],
  lonely: [-0.4, -0.3, -0.4, -0.6],
  anxious: [-0.5, 0.7, -0.5, -0.2],
  irritable: [-0.5, 0.5, 0.2, -0.4],
  stressed: [-0.6, 0.6, -0.3, -0.3],
  sad: [-0.6, -0.4, -0.5, -0.2],
  overwhelmed: [-0.4, 0.8, -0.7, 0.0],
  playful: [0.5, 0.5, 0.2, 0.7],
  protective: [0.2, 0.3, 0.6, 0.5],
  contemplative: [0.1, -0.2, 0.3, -0.1],
};

function computeMoodVector(neuromodulators) {
  const norm = (val) => (val - 50) / 50;

  const da = norm(neuromodulators.dopamine.value);
  const cort = norm(neuromodulators.cortisol.value);
  const ht = norm(neuromodulators.serotonin.value);
  const oxt = norm(neuromodulators.oxytocin.value);
  const ne = norm(neuromodulators.norepinephrine.value);
  const gaba = norm(neuromodulators.gaba.value);
  const ach = norm(neuromodulators.acetylcholine.value);

  const values = [da, cort, ht, oxt, ne, gaba, ach];

  const weightsV = [0.25, -0.3, 0.25, 0.15, -0.05, 0.1, 0.0];
  const weightsA = [0.15, 0.2, -0.1, 0.0, 0.35, -0.25, 0.15];
  const weightsD = [0.2, -0.25, 0.1, 0.05, 0.2, 0.1, 0.1];
  const weightsS = [0.1, -0.15, 0.15, 0.4, -0.05, 0.1, -0.05];

  const dot = (weights) => weights.reduce((sum, w, i) => sum + w * values[i], 0);

  return {
    valence: clamp(dot(weightsV), -1, 1),
    arousal: clamp(dot(weightsA), -1, 1),
    dominance: clamp(dot(weightsD), -1, 1),
    sociality: clamp(dot(weightsS), -1, 1),
  };
}

function vectorToLabel(vec) {
  let minDist = Infinity;
  let label = 'neutral';

  for (const [name, proto] of Object.entries(EMOTION_PROTOTYPES)) {
    const dist = Math.sqrt(
      (vec.valence - proto[0]) ** 2 +
        (vec.arousal - proto[1]) ** 2 +
        (vec.dominance - proto[2]) ** 2 +
        (vec.sociality - proto[3]) ** 2
    );

    if (dist < minDist) {
      minDist = dist;
      label = name;
    }
  }

  return {
    label,
    confidence: Math.max(0, 1 - minDist / 2),
    distance: minDist,
  };
}

class EmotionalMomentum {
  constructor() {
    this.history = [];
    this.maxHistory = 20;
    this.momentum = 0;
  }

  apply(newVector, prevVector) {
    this.history.push({ ...newVector, t: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    if (this.history.length >= 3) {
      const recentValences = this.history.slice(-10).map((h) => h.valence);
      const allPositive = recentValences.every((v) => v > 0);
      const allNegative = recentValences.every((v) => v < 0);

      if (allPositive || allNegative) {
        this.momentum = Math.min(0.7, this.momentum + 0.05);
      } else {
        this.momentum = Math.max(0, this.momentum - 0.1);
      }
    }

    const alpha = 1 - this.momentum;

    return {
      valence: clamp(alpha * newVector.valence + (1 - alpha) * prevVector.valence, -1, 1),
      arousal: clamp(alpha * newVector.arousal + (1 - alpha) * prevVector.arousal, -1, 1),
      dominance: clamp(alpha * newVector.dominance + (1 - alpha) * prevVector.dominance, -1, 1),
      sociality: clamp(alpha * newVector.sociality + (1 - alpha) * prevVector.sociality, -1, 1),
    };
  }
}

module.exports = {
  computeMoodVector,
  vectorToLabel,
  EmotionalMomentum,
  EMOTION_PROTOTYPES,
};
