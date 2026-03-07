class PredictionEngine {
  constructor() {
    this.priors = {
      praise: 0.3,
      criticism: 0.1,
      humor: 0.15,
      neutral: 0.25,
      question: 0.1,
      command: 0.05,
      error: 0.03,
      silence: 0.02,
    };
    this.recentStimuli = [];
    this.maxRecent = 50;
    this.uncertaintyLevel = 0.5;
    this.learningRate = 0.1;
  }

  processStimulusAndGetError(stimulusProfile) {
    const category = stimulusProfile.category || 'neutral';
    const predicted = this.priors[category] || 0.1;
    const surprise = -Math.log2(Math.max(predicted, 0.01));
    const signedSurprise = surprise * Number(stimulusProfile.valence || 0);

    if (!this.priors[category]) {
      this.priors[category] = 0.05;
    }

    for (const cat of Object.keys(this.priors)) {
      if (cat === category) {
        this.priors[cat] += this.learningRate * (1 - this.priors[cat]);
      } else {
        this.priors[cat] *= 1 - this.learningRate;
      }
    }

    const total = Object.values(this.priors).reduce((sum, value) => sum + value, 0) || 1;
    for (const cat of Object.keys(this.priors)) {
      this.priors[cat] /= total;
    }

    this.uncertaintyLevel = 0.9 * this.uncertaintyLevel + 0.1 * Math.min(surprise / 5, 1);

    this.recentStimuli.push({ category, timestamp: Date.now() });
    if (this.recentStimuli.length > this.maxRecent) {
      this.recentStimuli.shift();
    }

    return {
      surprise,
      signedSurprise,
      predicted,
      category,
      uncertaintyLevel: this.uncertaintyLevel,
    };
  }

  predictionErrorToNeuromod(predError) {
    const surprise = Number(predError.surprise || 0);
    const signedSurprise = Number(predError.signedSurprise || 0);
    const uncertainty = Number(predError.uncertaintyLevel || 0);

    const deltas = {};

    if (signedSurprise > 0) {
      deltas.dopamine = surprise * 8;
      deltas.serotonin = surprise * 3;
    } else if (signedSurprise < 0) {
      deltas.cortisol = surprise * 6;
      deltas.norepinephrine = surprise * 5;
      deltas.dopamine = signedSurprise * 5;
    }

    if (uncertainty > 0.7) {
      deltas.acetylcholine = (deltas.acetylcholine || 0) + (uncertainty - 0.5) * 10;
      deltas.norepinephrine = (deltas.norepinephrine || 0) + (uncertainty - 0.5) * 5;
    }

    return deltas;
  }
}

module.exports = { PredictionEngine };
