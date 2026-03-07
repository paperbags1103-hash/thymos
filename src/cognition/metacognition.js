const { clamp } = require('../utils/math');

class MetacognitionLayer {
  constructor(developmentStage) {
    this.devStage = developmentStage;
  }

  regulate(moodVector, broadcast, context) {
    const regulationCapacity = this.devStage.getRegulationCapacity();
    const regulated = { ...moodVector };
    const applied = [];

    for (const dim of ['valence', 'arousal', 'dominance', 'sociality']) {
      if (Math.abs(regulated[dim]) > 0.8) {
        const dampening = regulationCapacity * 0.3;
        regulated[dim] = clamp(regulated[dim] * (1 - dampening), -1, 1);
        applied.push(`${dim}_damped`);
      }
    }

    if (Number(broadcast?.conflict || 0) > 0.8 && regulationCapacity > 0.5) {
      regulated.arousal = clamp(regulated.arousal * 0.9, -1, 1);
      applied.push('conflict_calmed');
    }

    if (regulated.valence < -0.6 && !context?.isGenuineThreat) {
      const reappraisal = regulationCapacity * 0.2;
      regulated.valence = clamp(regulated.valence + reappraisal, -1, 1);
      applied.push('cognitive_reappraisal');
    }

    if (regulated.valence < -0.3 && context?.inConversation && regulationCapacity > 0.6) {
      regulated.valence = clamp(regulated.valence + regulationCapacity * 0.1, -1, 1);
      regulated.sociality = clamp(Math.max(regulated.sociality, -0.2), -1, 1);
      applied.push('social_regulation');
    }

    return {
      original: { ...moodVector },
      regulated,
      appliedRegulations: applied,
      regulationCapacity,
      selfAwareness: this._generateSelfAwareness(moodVector, applied),
    };
  }

  _generateSelfAwareness(vector, regulations) {
    const texts = [];

    if (vector.valence < -0.5) {
      texts.push('기분이 좋지 않다는 걸 인지하고 있음');
    }
    if (vector.arousal > 0.7) {
      texts.push('과도하게 흥분/긴장 상태임을 자각');
    }
    if (regulations.includes('cognitive_reappraisal')) {
      texts.push('감정적 반응을 의식적으로 조절 중');
    }

    return texts.length > 0 ? texts : null;
  }
}

module.exports = { MetacognitionLayer };
