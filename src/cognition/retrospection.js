const { avg, stddev } = require('../utils/math');

class RetrospectionEngine {
  constructor(intervalMs = 2 * 60 * 60 * 1000) {
    this.lastRetrospection = null;
    this.intervalMs = intervalMs;
    this.trajectoryLog = [];
    this.maxLog = 240;
  }

  logState(moodVector, label) {
    this.trajectoryLog.push({
      timestamp: Date.now(),
      vector: { ...moodVector },
      label,
    });
    if (this.trajectoryLog.length > this.maxLog) this.trajectoryLog.shift();
  }

  shouldRetrospect() {
    if (!this.lastRetrospection) return true;
    return Date.now() - this.lastRetrospection > this.intervalMs;
  }

  retrospect() {
    this.lastRetrospection = Date.now();

    if (this.trajectoryLog.length < 10) {
      return { insight: 'insufficient_data', adjustments: {} };
    }

    const recent = this.trajectoryLog.slice(-60);
    const earlier = this.trajectoryLog.slice(0, -60);

    const recentAvgV = avg(recent.map((r) => r.vector.valence));
    const recentAvgA = avg(recent.map((r) => r.vector.arousal));
    const earlierAvgV = earlier.length > 0 ? avg(earlier.map((r) => r.vector.valence)) : 0;
    const volatility = stddev(recent.map((r) => r.vector.valence));

    const adjustments = {};

    if (recentAvgV < -0.4 && volatility < 0.2) {
      adjustments.serotonin_baseline_mod = 3;
      adjustments.insight = 'sustained_negative_detected';
    }

    if (recentAvgA > 0.6 && volatility > 0.4) {
      adjustments.gaba_baseline_mod = 3;
      adjustments.insight = 'overload_pattern_detected';
    }

    if (recentAvgV > 0.5 && recentAvgV > earlierAvgV + 0.3) {
      adjustments.insight = 'positive_trend_detected';
    }

    return {
      insight: adjustments.insight || 'normal_fluctuation',
      adjustments,
      summary: {
        type: 'retrospection',
        timestamp: new Date().toISOString(),
        avgValence: recentAvgV,
        avgArousal: recentAvgA,
        volatility,
        insight: adjustments.insight || 'normal_fluctuation',
      },
      trajectory: {
        recentAvgValence: recentAvgV,
        recentAvgArousal: recentAvgA,
        volatility,
        trendDirection: recentAvgV > earlierAvgV ? 'improving' : 'declining',
      },
    };
  }
}

module.exports = { RetrospectionEngine };
