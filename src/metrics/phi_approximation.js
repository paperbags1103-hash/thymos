/**
 * phi_approximation.js — Φ (통합 정보) 근사 측정
 * Phase 5: IIT의 Φ를 근사 계산. 7×7 매트릭스 기반.
 *
 * 실제 Φ 계산은 NP-hard. 여기서는 합리적 근사:
 * 각 노드를 제거했을 때 전체 시스템 복잡도 변화의 합.
 */

// 상호작용 강도 매트릭스 (neuromodulators.js의 interactionMatrix와 동기화)
const INTERACTION_STRENGTHS = {
  dopamine:       { cortisol: -0.04, serotonin: 0.02, norepinephrine: 0.03 },
  cortisol:       { serotonin: -0.05, gaba: -0.03, dopamine: -0.02 },
  serotonin:      { dopamine: 0.02, gaba: 0.03, oxytocin: 0.02 },
  oxytocin:       { cortisol: -0.04, serotonin: 0.03, dopamine: 0.02 },
  norepinephrine: { acetylcholine: 0.03, cortisol: 0.02, gaba: -0.02 },
  gaba:           { norepinephrine: -0.03, cortisol: -0.02, dopamine: 0.01 },
  acetylcholine:  { dopamine: 0.02, norepinephrine: 0.02, serotonin: 0.01 },
};

class PhiApproximator {
  constructor() {
    this.lastPhi = 0;
  }

  /**
   * 현재 신경조절물질 상태에서 Φ 근사값 계산
   * @returns {number} 0-1 사이의 정규화된 Φ 값
   */
  approximatePhi(nmState) {
    const nodes = Object.keys(nmState);
    const n = nodes.length;
    if (n < 2) return 0;

    const fullComplexity = this._computeSystemComplexity(nmState, nodes);
    let integrationSum = 0;

    for (const removeNode of nodes) {
      const remainingNodes = nodes.filter(nd => nd !== removeNode);
      const reducedComplexity = this._computeSystemComplexity(nmState, remainingNodes);
      integrationSum += fullComplexity - reducedComplexity;
    }

    // 정규화 (노드 수와 최대 가능 값으로)
    const maxPossible = n * 0.5; // 대략적 상한
    const phi = Math.min(1, integrationSum / maxPossible);
    this.lastPhi = parseFloat(phi.toFixed(4));
    return this.lastPhi;
  }

  getLastPhi() {
    return this.lastPhi;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  _computeSystemComplexity(nmState, nodeList) {
    let complexity = 0;

    for (const a of nodeList) {
      const interactions = INTERACTION_STRENGTHS[a] || {};
      const aData = nmState[a];
      const aValue = (typeof aData === 'object' ? aData.value : aData) || 50;

      for (const b of nodeList) {
        if (a === b) continue;
        const strength = Math.abs(interactions[b] || 0);
        if (strength === 0) continue;

        const bData = nmState[b];
        const bValue = (typeof bData === 'object' ? bData.value : bData) || 50;

        // 실제 활성화 수준이 상호작용에 미치는 영향
        complexity += strength * (aValue / 100) * (bValue / 100);
      }
    }

    return complexity;
  }
}

module.exports = { PhiApproximator };
