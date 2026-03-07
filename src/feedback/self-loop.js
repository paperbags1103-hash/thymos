const config = require('../utils/config');
const { stimulusToNeuromodulators } = require('../cognition/classifier');

class SelfFeedbackLoop {
  constructor(classifier) {
    this.classifier = classifier;
    this.attenuation = config.selfFeedbackAttenuation || 0.3;
  }

  processSelfOutput(llmOutput) {
    const profile = this.classifier.fallbackKeywordClassify(String(llmOutput || ''));
    const deltas = stimulusToNeuromodulators(profile);

    for (const name of Object.keys(deltas)) {
      deltas[name] *= this.attenuation;
    }

    return deltas;
  }
}

module.exports = { SelfFeedbackLoop };
