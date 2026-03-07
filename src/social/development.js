class DevelopmentStage {
  constructor(state) {
    this.totalInteractions = state.totalInteractions || 0;
    this.createdAt = state.createdAt || Date.now();
  }

  getStage() {
    const days = (Date.now() - this.createdAt) / (24 * 60 * 60 * 1000);
    const interactions = this.totalInteractions;

    // Fix #3: OR → AND (둘 다 충족해야 다음 단계로)
    if (days < 3 && interactions < 50) {
      return {
        name: 'infant',
        label: '유아기',
        volatility: 1.5,
        regulationCapacity: 0.1,
        agentWeights: { id: 1.5, ego: 0.8, superego: 0.5 },
      };
    }

    if (days < 14 && interactions < 300) {
      return {
        name: 'child',
        label: '아동기',
        volatility: 1.2,
        regulationCapacity: 0.3,
        agentWeights: { id: 1.2, ego: 1.0, superego: 0.8 },
      };
    }

    if (days < 60 && interactions < 1500) {
      return {
        name: 'adolescent',
        label: '청소년기',
        volatility: 1.1,
        regulationCapacity: 0.5,
        agentWeights: { id: 1.0, ego: 1.1, superego: 1.0 },
      };
    }

    return {
      name: 'adult',
      label: '성인기',
      volatility: 0.8,
      regulationCapacity: 0.8,
      agentWeights: { id: 0.8, ego: 1.3, superego: 1.1 },
    };
  }

  getRegulationCapacity() {
    return this.getStage().regulationCapacity;
  }

  getVolatility() {
    return this.getStage().volatility;
  }

  getAgentWeights() {
    return this.getStage().agentWeights;
  }

  recordInteraction() {
    this.totalInteractions += 1;
  }
}

module.exports = { DevelopmentStage };
