/**
 * homeostasis.js — 항상성 드라이브 (Active Homeostasis)
 * Phase 2: 선호 범위를 벗어난 NM에 내부 압력 생성
 */

const PREFERRED_RANGES = {
  dopamine:       { min: 40, max: 75 },
  cortisol:       { min: 8,  max: 38 },
  serotonin:      { min: 48, max: 80 },
  oxytocin:       { min: 32, max: 65 },
  norepinephrine: { min: 22, max: 52 },
  gaba:           { min: 42, max: 72 },
  acetylcholine:  { min: 38, max: 62 },
};

class ActiveHomeostasis {
  constructor() {
    this.drives = {};
    this.actionSuggestion = null;
    this.urgency = 0;
  }

  /**
   * 현재 NM 상태 평가 → 항상성 드라이브 계산
   */
  compute(nmState) {
    this.drives = {};
    let maxUrgency = 0;

    for (const [nm, range] of Object.entries(PREFERRED_RANGES)) {
      const nmData = nmState[nm];
      if (!nmData) continue;
      const value = typeof nmData === 'object' ? nmData.value : nmData;

      if (value < range.min) {
        const drive = (range.min - value) / range.min;
        this.drives[nm] = drive; // 양수: 올려야 함
        maxUrgency = Math.max(maxUrgency, drive);
      } else if (value > range.max) {
        const drive = -((value - range.max) / (100 - range.max));
        this.drives[nm] = drive; // 음수: 내려야 함
        maxUrgency = Math.max(maxUrgency, Math.abs(drive));
      } else {
        this.drives[nm] = 0;
      }
    }

    this.urgency = maxUrgency;
    this.actionSuggestion = this._suggestAction();
    return this.drives;
  }

  getUrgency() {
    return this.urgency;
  }

  /**
   * 가장 강한 압력에 따른 행동 제안
   * - proactive: 선제적 메시지 권장
   * - self_soothe: 자기진정 행동
   * - engage: 더 적극적 참여
   */
  getActionSuggestion() {
    return this.actionSuggestion;
  }

  toPromptText() {
    if (!this.actionSuggestion || this.urgency < 0.3) return '';
    const actions = {
      proactive: 'internal drive: reach out',
      self_soothe: 'internal drive: seek calm',
      engage: 'internal drive: be more engaged',
      rest: 'internal drive: conserve energy',
    };
    return actions[this.actionSuggestion] || '';
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _suggestAction() {
    if (this.urgency < 0.25) return null;

    const strongest = Object.entries(this.drives)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0];

    if (!strongest) return null;
    const [nm, drive] = strongest;

    if (nm === 'dopamine' && drive > 0) return 'proactive';   // 도파민 낮음 → 먼저 말 걸기
    if (nm === 'cortisol' && drive < 0) return 'self_soothe'; // 코르티솔 높음 → 진정
    if (nm === 'oxytocin' && drive > 0) return 'proactive';   // 옥시토신 낮음 → 연결 추구
    if (nm === 'gaba' && drive < 0) return 'self_soothe';      // GABA 낮음 → 진정
    if (nm === 'serotonin' && drive > 0) return 'engage';      // 세로토닌 낮음 → 참여
    if (nm === 'norepinephrine' && drive < 0) return 'rest';   // NE 높음 → 휴식

    return drive > 0 ? 'engage' : 'rest';
  }
}

module.exports = { ActiveHomeostasis, PREFERRED_RANGES };
