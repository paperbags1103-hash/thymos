/**
 * ignition.js — GWT 점화(Ignition) 메커니즘
 * 진정한 전역 작업공간: 임계값 기반 비선형 전파
 */

const { MODULE_REGISTRY, MODULE_AFFINITY, computeModuleActivations, moduleToSuggestion } = require('./modules');

const IGNITION_THRESHOLD = 0.62;
const SPREAD_RATE = 0.3;
const SUPPRESSION_FACTOR = 0.3;

class IgnitionEngine {
  constructor() {
    this.threshold = IGNITION_THRESHOLD;
    this.lastIgnition = null;
    this.broadcastModulations = {}; // 방송 후 다음 틱 변조값
    this.noIgnitionCount = 0;       // 연속 미점화 카운트
  }

  /**
   * 메인 경쟁 메서드
   * @returns {{ broadcast, conflict, primary, secondary }}
   */
  compete(nmState, devStage) {
    // 1. 모듈 활성화 계산
    const rawActivations = computeModuleActivations(nmState, devStage);

    // 2. 방송 변조 적용 (이전 점화의 영향)
    const modulated = this._applyBroadcastModulations(rawActivations);

    // 3. 상호 억제 (lateral inhibition)
    const inhibited = this._applyLateralInhibition(modulated);

    // 4. 최고 활성화 확인
    const sorted = Object.entries(inhibited).sort(([, a], [, b]) => b - a);
    const [winnerName, winnerScore] = sorted[0];
    const [secondName, secondScore] = sorted[1] || [null, 0];

    // 5. 점화 여부 결정
    if (winnerScore < this.threshold) {
      this.noIgnitionCount++;
      // 미점화: 무의식적 처리. 약한 드라이브 반환
      return {
        broadcast: null,
        ignited: false,
        primary: {
          agent: winnerName,
          suggestion: moduleToSuggestion(winnerName, winnerScore),
          influence: winnerScore,
        },
        secondary: secondName ? {
          agent: secondName,
          suggestion: moduleToSuggestion(secondName, secondScore),
          influence: secondScore,
        } : null,
        conflict: this._computeConflict(inhibited),
        activations: inhibited,
      };
    }

    // 6. 점화! 비선형 강도 계산
    this.noIgnitionCount = 0;
    const ignitionStrength = this._sigmoid(winnerScore - this.threshold, 8);

    // 7. 방송 변조 준비 (다음 틱에 적용)
    this._prepareBroadcastModulations(winnerName, ignitionStrength);

    const broadcast = {
      winner: winnerName,
      strength: ignitionStrength,
      timestamp: Date.now(),
    };
    this.lastIgnition = broadcast;

    return {
      broadcast,
      ignited: true,
      primary: {
        agent: winnerName,
        suggestion: moduleToSuggestion(winnerName, winnerScore),
        influence: ignitionStrength,
      },
      secondary: secondName ? {
        agent: secondName,
        suggestion: moduleToSuggestion(secondName, secondScore),
        influence: secondScore,
      } : null,
      conflict: this._computeConflict(inhibited),
      activations: inhibited,
    };
  }

  /**
   * 방송 피드백: 점화된 모듈이 다음 틱의 NM 기준값 변조
   * daemon.js의 tick()에서 호출
   */
  getBroadcastNMBoosts() {
    return this.broadcastNMBoosts || {};
  }

  clearBroadcastNMBoosts() {
    this.broadcastNMBoosts = {};
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _applyBroadcastModulations(activations) {
    const result = { ...activations };
    for (const [name, mod] of Object.entries(this.broadcastModulations)) {
      if (result[name] !== undefined) {
        result[name] = Math.min(1.0, result[name] + mod);
      }
    }
    // 변조 소진
    this.broadcastModulations = {};
    return result;
  }

  _applyLateralInhibition(activations) {
    const sorted = Object.entries(activations).sort(([, a], [, b]) => b - a);
    const result = { ...activations };
    const [topName, topScore] = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const [name, score] = sorted[i];
      const suppress = topScore * SUPPRESSION_FACTOR * (1 - i * 0.08);
      result[name] = Math.max(0, score - suppress);
    }

    return result;
  }

  _prepareBroadcastModulations(winnerName, strength) {
    const affinities = MODULE_AFFINITY[winnerName] || {};
    this.broadcastModulations = {};

    for (const [modName, affinity] of Object.entries(affinities)) {
      this.broadcastModulations[modName] = affinity * strength * SPREAD_RATE;
    }

    // 승자 모듈의 nmSensitive NM에 boost
    const winnerMod = MODULE_REGISTRY[winnerName];
    if (winnerMod) {
      this.broadcastNMBoosts = this.broadcastNMBoosts || {};
      for (const nmName of winnerMod.nmSensitive) {
        this.broadcastNMBoosts[nmName] = (this.broadcastNMBoosts[nmName] || 0) + strength * 2.5;
      }
    }
  }

  _computeConflict(activations) {
    const values = Object.values(activations).filter(v => v > 0);
    if (values.length < 2) return 0;
    const sorted = values.sort((a, b) => b - a);
    const gap = sorted[0] - sorted[1];
    return Math.max(0, 1 - gap * 2); // gap 클수록 갈등 낮음
  }

  _sigmoid(x, k) {
    return 1 / (1 + Math.exp(-k * x));
  }
}

module.exports = { IgnitionEngine };
