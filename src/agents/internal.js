class InternalAgents {
  generateIdResponse(neuromodulators, stimulus) {
    const da = neuromodulators.dopamine.value;
    const ne = neuromodulators.norepinephrine.value;

    const activation = da / 100 * 0.6 + ne / 100 * 0.4;

    const biases = [];
    if (da > 70) biases.push('enthusiastic', 'risk-taking', 'creative');
    if (ne > 70) biases.push('urgent', 'impulsive', 'fight-or-flight');
    if (da > 60 && ne < 40) biases.push('playful', 'curious');
    if (da < 30) biases.push('avoidant', 'disengaged');

    return {
      agent: 'id',
      activation,
      biases,
      urgency: ne / 100,
      suggestion: this._idSuggestion(biases),
      stimulusType: stimulus?.type || null,
    };
  }

  generateEgoResponse(neuromodulators, stimulus, context) {
    const balance = this._calculateBalance(neuromodulators);
    const activation = 0.4 + balance * 0.3;

    const biases = ['pragmatic', 'context-aware'];
    if (context?.isUrgent) biases.push('efficient');
    if (context?.isComplex) biases.push('methodical');

    return {
      agent: 'ego',
      activation,
      biases,
      suggestion: '상황에 맞게 적절히 대응',
      stimulusType: stimulus?.type || null,
    };
  }

  generateSuperegoResponse(neuromodulators, stimulus) {
    const ht = neuromodulators.serotonin.value;
    const gaba = neuromodulators.gaba.value;
    const oxt = neuromodulators.oxytocin.value;

    const activation = ht / 100 * 0.4 + gaba / 100 * 0.3 + oxt / 100 * 0.3;

    const biases = [];
    if (ht > 60) biases.push('measured', 'patient');
    if (gaba > 60) biases.push('cautious', 'inhibited');
    if (oxt > 60) biases.push('empathetic', 'caring');
    biases.push('principled');

    return {
      agent: 'superego',
      activation,
      biases,
      suggestion: this._superegoSuggestion(biases),
      stimulusType: stimulus?.type || null,
    };
  }

  _calculateBalance(nm) {
    const values = Object.values(nm).map((item) => item.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.max(0, 1 - variance / 1000);
  }

  _idSuggestion(biases) {
    if (biases.includes('fight-or-flight')) return '즉각 대응! 지금 바로 행동!';
    if (biases.includes('enthusiastic')) return '적극적으로! 더 해보자!';
    if (biases.includes('playful')) return '재미있게 가자~ 농담 하나?';
    return '뭔가 하고 싶다';
  }

  _superegoSuggestion(biases) {
    if (biases.includes('cautious')) return '신중하게. 한 번 더 확인.';
    if (biases.includes('empathetic')) return '상대방 감정을 먼저 고려.';
    return '원칙에 맞게 행동.';
  }
}

module.exports = { InternalAgents };
