/**
 * energy.js — 에너지 경제 시스템
 * Phase 4: 신체성 시뮬레이션. 에너지 소비/회복으로 자원 제약 모사.
 */

const CONSUME_RATES = {
  idle:         0.08,  // 기본 소비 (분당)
  responding:   1.8,   // 응답 생성 시
  highConflict: 1.2,   // 내적 갈등 추가 소비
  proactive:    2.5,   // 선제적 메시지
};

const RESTORE_RATE = 0.6; // 분당 회복 (비활동 시)
const INITIAL_ENERGY = 72;

class EnergySystem {
  constructor() {
    this.energy = INITIAL_ENERGY;
    this.lastActivityAt = Date.now();
    this.lastActivity = 'idle';
  }

  /**
   * 틱마다 에너지 업데이트
   * @param {'idle'|'responding'|'proactive'} activity
   * @param {number} conflictLevel
   * @param {number} elapsedMin 경과 시간 (분)
   */
  tick(activity, conflictLevel, elapsedMin) {
    const elapsed = elapsedMin || 0.5; // 기본 30초

    // 비활동 시간 회복
    const idleTime = Math.max(0, elapsed - (activity !== 'idle' ? 0.1 : 0));
    const restore = activity === 'idle' ? RESTORE_RATE * elapsed : RESTORE_RATE * idleTime * 0.3;

    // 소비
    const baseConsume = (CONSUME_RATES[activity] || CONSUME_RATES.idle) * 0.5; // 30초 기준
    const conflictConsume = conflictLevel > 0.6 ? CONSUME_RATES.highConflict * 0.5 : 0;

    this.energy = Math.max(0, Math.min(100, this.energy - baseConsume - conflictConsume + restore));
    this.lastActivity = activity;
    this.lastActivityAt = Date.now();

    return this.energy;
  }

  recordActivity(activity) {
    this.lastActivity = activity;
    const consume = CONSUME_RATES[activity] || CONSUME_RATES.idle;
    this.energy = Math.max(0, this.energy - consume);
  }

  /**
   * 에너지가 NM에 미치는 영향
   */
  getNMEffect() {
    if (this.energy < 20) {
      return { gaba: +12, dopamine: -10, norepinephrine: -12, serotonin: -5 };
    } else if (this.energy < 35) {
      return { gaba: +6, dopamine: -5, norepinephrine: -5 };
    } else if (this.energy > 85) {
      return { dopamine: +3, norepinephrine: +2, acetylcholine: +2 };
    }
    return {};
  }

  getLevel() {
    if (this.energy < 20) return 'exhausted';
    if (this.energy < 40) return 'tired';
    if (this.energy < 60) return 'moderate';
    if (this.energy < 80) return 'good';
    return 'energized';
  }

  toPromptText() {
    const level = this.getLevel();
    if (level === 'exhausted') return 'Energy: exhausted — very brief responses';
    if (level === 'tired') return 'Energy: low — keep responses concise';
    if (level === 'energized') return 'Energy: high — fully engaged';
    return '';
  }

  toState() {
    return {
      value: Math.round(this.energy),
      level: this.getLevel(),
    };
  }
}

module.exports = { EnergySystem };
