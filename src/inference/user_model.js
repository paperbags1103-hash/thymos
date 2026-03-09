/**
 * user_model.js — 사용자 행동 예측 모델
 * Phase 2: 능동적 추론 — 수동적 반응 → 능동적 예측
 */

class UserModel {
  constructor(userId) {
    this.userId = userId;
    this.intervals = [];           // 자극 간격 (ms)
    this.categoryCount = {};       // 카테고리별 빈도
    this.timeOfDay = new Array(24).fill(0); // 시간대별 활동
    this.lastStimulusAt = null;
    this.sequenceHistory = [];     // 최근 카테고리 시퀀스 (10개)
    this.predictions = {
      nextStimulusAt: null,
      predictedCategory: null,
      confidence: 0,
    };
  }

  update(stimulus, timestamp = Date.now()) {
    // 간격 기록
    if (this.lastStimulusAt) {
      const interval = timestamp - this.lastStimulusAt;
      if (interval < 24 * 60 * 60 * 1000) { // 24시간 이내만
        this.intervals.push(interval);
        if (this.intervals.length > 50) this.intervals.shift();
      }
    }
    this.lastStimulusAt = timestamp;

    // 카테고리 빈도
    const cat = stimulus.category || 'neutral';
    this.categoryCount[cat] = (this.categoryCount[cat] || 0) + 1;

    // 시간대
    const hour = new Date(timestamp).getHours();
    this.timeOfDay[hour]++;

    // 시퀀스
    this.sequenceHistory.push(cat);
    if (this.sequenceHistory.length > 10) this.sequenceHistory.shift();

    // 예측 갱신
    this._generatePrediction(timestamp);
  }

  getSurpriseScore(actualStimulus) {
    const { predictedCategory, confidence } = this.predictions;
    if (!predictedCategory || confidence < 0.3) return 0.5;

    const categoryMatch = predictedCategory === (actualStimulus.category || 'neutral') ? 1 : 0;
    const timingSurprise = this._computeTimingSurprise();

    // 예측이 확실할수록 놀라움이 크게 나타남
    return (1 - categoryMatch) * 0.6 * confidence + timingSurprise * 0.4;
  }

  toState() {
    return {
      userId: this.userId,
      predictions: this.predictions,
      dominantCategory: this._getDominantCategory(),
    };
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _generatePrediction(now) {
    // 다음 자극 시각 예측
    if (this.intervals.length >= 3) {
      const avg = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
      this.predictions.nextStimulusAt = (this.lastStimulusAt || now) + avg;
    }

    // 카테고리 예측 (가장 많이 온 것)
    const dominant = this._getDominantCategory();
    this.predictions.predictedCategory = dominant;

    // 신뢰도: 샘플이 많을수록, 분포가 치우칠수록 높음
    const total = Object.values(this.categoryCount).reduce((a, b) => a + b, 0);
    if (total > 5 && dominant) {
      const dominantCount = this.categoryCount[dominant] || 0;
      this.predictions.confidence = Math.min(0.9, dominantCount / total * 1.5);
    } else {
      this.predictions.confidence = 0;
    }
  }

  _getDominantCategory() {
    const entries = Object.entries(this.categoryCount);
    if (entries.length === 0) return null;
    return entries.sort(([, a], [, b]) => b - a)[0][0];
  }

  _computeTimingSurprise() {
    if (!this.predictions.nextStimulusAt || !this.lastStimulusAt) return 0;
    const expected = this.predictions.nextStimulusAt;
    const actual = this.lastStimulusAt;
    const avgInterval = this.intervals.length > 0
      ? this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length
      : 60000;

    const timeDiff = Math.abs(actual - expected);
    return Math.min(1, timeDiff / avgInterval);
  }
}

/**
 * 사용자별 모델 맵 관리
 */
class UserModelManager {
  constructor() {
    this.models = {};
  }

  getOrCreate(userId) {
    if (!userId) return new UserModel('anonymous');
    if (!this.models[userId]) {
      this.models[userId] = new UserModel(userId);
    }
    return this.models[userId];
  }

  update(stimulus, userId, timestamp) {
    const model = this.getOrCreate(userId);
    model.update(stimulus, timestamp);
    return model;
  }

  getSurpriseScore(stimulus, userId) {
    const model = this.models[userId];
    if (!model) return 0.5;
    return model.getSurpriseScore(stimulus);
  }

  toState() {
    const result = {};
    for (const [uid, model] of Object.entries(this.models)) {
      result[uid] = model.toState();
    }
    return result;
  }
}

module.exports = { UserModel, UserModelManager };
