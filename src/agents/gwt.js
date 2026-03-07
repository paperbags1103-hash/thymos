const { clamp } = require('../utils/math');

function globalWorkspaceCompetition(idResponse, egoResponse, superegoResponse, devStage) {
  const responses = [idResponse, egoResponse, superegoResponse];
  const stageWeights = devStage.getAgentWeights();

  const weighted = responses.map((response) => ({
    ...response,
    weightedActivation: response.activation * (stageWeights[response.agent] || 1),
  }));

  weighted.sort((a, b) => b.weightedActivation - a.weightedActivation);

  const winner = weighted[0];
  const runner = weighted[1];
  const third = weighted[2];
  const denom = winner.weightedActivation || 1;

  return {
    primary: {
      agent: winner.agent,
      biases: winner.biases,
      activation: winner.weightedActivation,
      suggestion: winner.suggestion,
    },
    secondary: {
      agent: runner.agent,
      biases: runner.biases,
      influence: clamp(runner.weightedActivation / denom, 0, 1),
    },
    tertiary: {
      agent: third.agent,
      influence: clamp(third.weightedActivation / denom, 0, 1),
    },
    conflict: clamp(1 - (winner.weightedActivation - runner.weightedActivation), 0, 1),
  };
}

module.exports = { globalWorkspaceCompetition };
