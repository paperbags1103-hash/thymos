/**
 * narrative.js — 내러티브 자아 (Narrative Self)
 * Phase 3: 연속적 자기 서사. 중요 사건을 압축 저장해 정체성 연속성 유지.
 */

const MAX_STORY_LENGTH = 20;
const SIGNIFICANCE_VALENCE = 0.65;

class NarrativeSelf {
  constructor() {
    this.story = [];
    this.selfConcept = {
      dominantMood: null,       // "나는 주로 warm한 편이다"
      dominantDrive: null,      // "나는 호기심이 많다"
      recentChapter: null,      // "요즘은 스트레스가 많다"
      moodHistory: [],          // 최근 기분 레이블 (10개)
      winnerHistory: [],        // 최근 승자 모듈 (10개)
    };
  }

  /**
   * 매 틱마다 호출. 중요 사건만 기록.
   */
  update(state, broadcast) {
    const vec = state.mood?.vector || state.moodVector || {};
    const valence = Number(vec.valence ?? 0);
    const label = state.mood?.label || state.moodLabel?.label || 'neutral';
    const winner = broadcast?.winner || broadcast?.primary?.agent;

    // 최근 히스토리 업데이트
    this.selfConcept.moodHistory.push(label);
    if (this.selfConcept.moodHistory.length > 10) this.selfConcept.moodHistory.shift();

    if (winner) {
      this.selfConcept.winnerHistory.push(winner);
      if (this.selfConcept.winnerHistory.length > 10) this.selfConcept.winnerHistory.shift();
    }

    // 중요 사건 필터
    const ignited = broadcast?.ignited === true;
    const extreme = Math.abs(valence) > SIGNIFICANCE_VALENCE;

    if (ignited || extreme) {
      this.story.push({
        timestamp: Date.now(),
        summary: this._summarize(state, broadcast, valence),
        valence,
        winner,
      });
      if (this.story.length > MAX_STORY_LENGTH) this.story.shift();
    }

    // 자기 개념 업데이트 (10틱마다)
    if (this.selfConcept.moodHistory.length >= 5) {
      this._updateSelfConcept();
    }
  }

  toPromptText() {
    const sc = this.selfConcept;
    const lines = [];

    if (sc.dominantMood) {
      lines.push(`Self-concept: usually ${sc.dominantMood}`);
    }
    if (sc.recentChapter && sc.recentChapter !== sc.dominantMood) {
      lines.push(`Recently: ${sc.recentChapter}`);
    }
    if (sc.dominantDrive) {
      lines.push(`Drive pattern: ${sc.dominantDrive}`);
    }

    return lines.join('\n');
  }

  toState() {
    return {
      selfConcept: {
        dominantMood: this.selfConcept.dominantMood,
        dominantDrive: this.selfConcept.dominantDrive,
        recentChapter: this.selfConcept.recentChapter,
      },
      recentEvents: this.story.slice(-5).map(e => ({
        summary: e.summary,
        valence: e.valence,
        winner: e.winner,
        ago: Math.round((Date.now() - e.timestamp) / 60000) + 'm ago',
      })),
    };
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _summarize(state, broadcast, valence) {
    const label = state.mood?.label || 'neutral';
    const winner = broadcast?.winner || broadcast?.primary?.agent;
    const stage = state.development?.label || '';

    if (valence < -0.6) return `distressed state: ${label}${winner ? ` (${winner} dominant)` : ''}`;
    if (valence > 0.6) return `positive state: ${label}${winner ? ` (${winner} dominant)` : ''}`;
    if (broadcast?.ignited) return `ignition: ${winner || 'unknown'} module fired`;
    return `notable: ${label}`;
  }

  _updateSelfConcept() {
    // 지배적 기분 (빈도 기반)
    const moodFreq = {};
    for (const m of this.selfConcept.moodHistory) {
      moodFreq[m] = (moodFreq[m] || 0) + 1;
    }
    const topMood = Object.entries(moodFreq).sort(([, a], [, b]) => b - a)[0];
    if (topMood) this.selfConcept.dominantMood = topMood[0];

    // 최근 챕터 (최근 3개 기분)
    const recent3 = this.selfConcept.moodHistory.slice(-3);
    const recentFreq = {};
    for (const m of recent3) recentFreq[m] = (recentFreq[m] || 0) + 1;
    const topRecent = Object.entries(recentFreq).sort(([, a], [, b]) => b - a)[0];
    if (topRecent) this.selfConcept.recentChapter = topRecent[0];

    // 지배적 드라이브 모듈
    const winnerFreq = {};
    for (const w of this.selfConcept.winnerHistory) {
      winnerFreq[w] = (winnerFreq[w] || 0) + 1;
    }
    const topWinner = Object.entries(winnerFreq).sort(([, a], [, b]) => b - a)[0];
    if (topWinner) this.selfConcept.dominantDrive = topWinner[0];
  }
}

module.exports = { NarrativeSelf };
