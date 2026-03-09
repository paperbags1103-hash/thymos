/**
 * attention.js — 주의 자원 시스템
 * Phase 4: 모든 자극에 동일한 주의 → 자원 제약 배분
 */

const CAPACITY = 1.0;
const OVERLOAD_THRESHOLD = 0.88;

class AttentionalResources {
  constructor() {
    this.capacity = CAPACITY;
    this.allocated = {};
    this.overloaded = false;
  }

  /**
   * 모듈 활성화 점수 기반 주의 배분
   */
  allocate(moduleActivations) {
    const demands = { ...moduleActivations };
    const totalDemand = Object.values(demands).reduce((a, b) => a + b, 0);

    if (totalDemand > this.capacity) {
      // 과부하 → 강한 것에 집중
      const scale = this.capacity / totalDemand;
      for (const k of Object.keys(demands)) {
        demands[k] *= scale;
      }
    }

    this.allocated = demands;
    const total = Object.values(this.allocated).reduce((a, b) => a + b, 0);
    this.overloaded = total > OVERLOAD_THRESHOLD;

    return this.allocated;
  }

  isOverloaded() {
    return this.overloaded;
  }

  /**
   * 과부하 시 에이전트 행동에 미치는 영향
   */
  getOverloadEffect() {
    if (!this.overloaded) return null;
    return {
      suggestion: 'attention overloaded — simplify response',
      gaba: +5, // 진정 효과
    };
  }

  toState() {
    return {
      overloaded: this.overloaded,
      topModules: Object.entries(this.allocated)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([k, v]) => ({ module: k, allocation: parseFloat(v.toFixed(3)) })),
    };
  }
}

module.exports = { AttentionalResources };
