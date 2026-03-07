class SocialModel {
  constructor() {
    this.models = {};
  }

  updateModel(authorId, stimulusProfile) {
    if (!authorId) return null;

    const id = String(authorId);
    if (!this.models[id]) {
      this.models[id] = {
        estimatedValence: 0,
        estimatedArousal: 0,
        confidence: 0.3,
        interactionCount: 0,
        lastUpdated: Date.now(),
        traits: {
          baselineValence: 0,
          volatility: 0.5,
          expressiveness: 0.5,
        },
      };
    }

    const model = this.models[id];
    const alpha = 0.3;

    model.estimatedValence = (1 - alpha) * model.estimatedValence + alpha * Number(stimulusProfile.valence || 0);
    model.estimatedArousal = (1 - alpha) * model.estimatedArousal + alpha * Number(stimulusProfile.arousal || 0);
    model.interactionCount += 1;
    model.lastUpdated = Date.now();
    model.confidence = Math.min(0.9, 0.3 + model.interactionCount * 0.01);

    return model;
  }

  getEstimatedState(authorId) {
    const model = this.models[String(authorId || '')];
    if (!model) return null;

    const elapsed = (Date.now() - model.lastUpdated) / 60000;
    const decayedConfidence = model.confidence * Math.exp(-elapsed / 120);
    if (decayedConfidence < 0.2) return null;

    return {
      estimatedValence: model.estimatedValence,
      estimatedArousal: model.estimatedArousal,
      confidence: decayedConfidence,
      interaction: model.interactionCount,
    };
  }

  toPromptText(authorId) {
    const state = this.getEstimatedState(authorId);
    if (!state || state.confidence < 0.3) return '';

    const moodWords = [];
    if (state.estimatedValence > 0.3) moodWords.push('긍정적');
    else if (state.estimatedValence < -0.3) moodWords.push('부정적');

    if (state.estimatedArousal > 0.3) moodWords.push('활발한');
    else if (state.estimatedArousal < -0.3) moodWords.push('차분한');

    const mood = moodWords.length > 0 ? moodWords.join(', ') : '중립적';

    return `[Social Awareness] ${authorId}의 추정 감정: ${mood} (confidence: ${(state.confidence * 100).toFixed(0)}%)`;
  }
}

module.exports = { SocialModel };
