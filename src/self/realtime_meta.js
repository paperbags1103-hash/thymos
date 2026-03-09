/**
 * realtime_meta.js — 실시간 메타인지
 * Phase 3: 최근 처리 패턴 모니터링 + 패턴 고착 감지
 */

const HISTORY_SIZE = 10;
const STUCK_THRESHOLD = 5; // N틱 연속 같은 모듈 → 고착

class RealtimeMetacognition {
  constructor() {
    this.processingHistory = [];
    this.stuckCount = 0;
    this.disruptionActive = false;
  }

  /**
   * 매 틱 결과 관찰
   * @returns {string[]} 자기 인식 메시지 배열
   */
  observe(broadcast, nmState) {
    const winner = broadcast?.winner || broadcast?.primary?.agent;
    const conflict = Number(broadcast?.conflict ?? 0);
    const ignited = broadcast?.ignited === true;

    this.processingHistory.push({
      timestamp: Date.now(),
      winner,
      conflict,
      ignited,
    });
    if (this.processingHistory.length > HISTORY_SIZE) {
      this.processingHistory.shift();
    }

    const awareness = this._generateAwareness(conflict, nmState);

    // 패턴 고착 처리
    if (this._isStuckInPattern()) {
      this.stuckCount++;
      if (this.stuckCount >= 3 && !this.disruptionActive) {
        this.disruptionActive = true;
        awareness.push('breaking repetitive pattern');
      }
    } else {
      this.stuckCount = 0;
      this.disruptionActive = false;
    }

    return awareness;
  }

  /**
   * 패턴 고착 시 노이즈 증가 계수 반환
   */
  getDisruptionFactor() {
    return this.disruptionActive ? 1.8 : 1.0;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _isStuckInPattern() {
    const recent = this.processingHistory.slice(-STUCK_THRESHOLD);
    if (recent.length < STUCK_THRESHOLD) return false;
    const first = recent[0].winner;
    if (!first) return false;
    return recent.every(r => r.winner === first);
  }

  _generateAwareness(conflict, nmState) {
    const awareness = [];

    // 높은 갈등
    if (conflict > 0.78) {
      awareness.push('high internal conflict — multiple drives competing');
    }

    // NM 극단값
    if (nmState) {
      const extremes = [];
      for (const [nm, data] of Object.entries(nmState)) {
        const value = typeof data === 'object' ? data.value : data;
        if (value > 90) extremes.push(`${nm} very high`);
        else if (value < 10) extremes.push(`${nm} very low`);
      }
      if (extremes.length > 0) {
        awareness.push(`extreme states: ${extremes.slice(0, 2).join(', ')}`);
      }
    }

    // 오랜 미점화
    const recent5 = this.processingHistory.slice(-5);
    if (recent5.length === 5 && recent5.every(r => !r.ignited)) {
      awareness.push('operating below ignition threshold — subdued processing');
    }

    return awareness;
  }
}

module.exports = { RealtimeMetacognition };
