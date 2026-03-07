class SomaticMarkerSystem {
  constructor(emotionalMemory) {
    this.emotionalMemory = emotionalMemory;
    this.decisionOutcomes = [];
    this.maxOutcomes = 100;
  }

  recordOutcome(decision, outcome) {
    this.decisionOutcomes.push({
      decision: {
        type: decision?.type || 'unknown',
        keywords: decision?.keywords || [],
        context: decision?.context || {},
      },
      outcome: {
        valence: Number(outcome?.valence || 0),
        timestamp: Date.now(),
      },
    });

    if (this.decisionOutcomes.length > this.maxOutcomes) {
      this.decisionOutcomes.shift();
    }
  }

  getGutFeeling(proposedDecision) {
    const similar = this.decisionOutcomes.filter((item) => {
      const typeMatch = item.decision.type === proposedDecision?.type;
      const keywordOverlap = (item.decision.keywords || []).some((keyword) =>
        (proposedDecision?.keywords || []).includes(keyword)
      );
      return typeMatch || keywordOverlap;
    });

    if (similar.length === 0) {
      return { feeling: 'neutral', confidence: 0, suggestion: '경험 없음 — 판단 유보' };
    }

    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of similar) {
      const recency = Math.exp(-(now - item.outcome.timestamp) / (7 * 24 * 60 * 60 * 1000));
      weightedSum += item.outcome.valence * recency;
      totalWeight += recency;
    }

    const avgOutcome = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const confidence = Math.min(similar.length / 5, 1);

    let feeling = 'mixed';
    let suggestion = '결과가 엇갈렸던 유형 — 맥락 판단 필요';

    if (avgOutcome > 0.3) {
      feeling = 'positive';
      suggestion = '과거 경험상 좋은 결과를 낸 유형의 결정';
    } else if (avgOutcome < -0.3) {
      feeling = 'negative';
      suggestion = '과거 경험상 좋지 않았던 유형 — 신중하게';
    }

    return { feeling, confidence, avgOutcome, suggestion, sampleSize: similar.length };
  }
}

module.exports = { SomaticMarkerSystem };
