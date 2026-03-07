function signed(value) {
  const num = Number(value || 0);
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}`;
}

function generatePromptInjection(state, socialModel) {
  const mood = state.mood || {};
  const vec = mood.vector || state.moodVector || { valence: 0, arousal: 0, dominance: 0, sociality: 0 };
  const label = mood.label || state.moodLabel?.label || 'neutral';

  const primary = state.gwt?.primary;
  const secondary = state.gwt?.secondary;
  const conflict = Number(state.gwt?.conflict || 0);

  const drive = primary
    ? `${primary.agent} - ${primary.suggestion}`
    : state.drive || 'stable baseline';

  const secondaryText = secondary?.influence > 0.5 ? ` (${secondary.agent} support)` : '';

  const stageName = state.development?.label || state.development?.stage || state.developmentStage || 'infant';
  const awareness = state.metacognition?.selfAwareness;
  const uncertainty = Number(state.prediction?.uncertaintyLevel ?? 0.5);

  const lines = [];
  lines.push('[Thymos State]');
  lines.push(`Mood: ${label} (V:${signed(vec.valence)} A:${signed(vec.arousal)} D:${signed(vec.dominance)} S:${signed(vec.sociality)})`);
  lines.push(`Drive: ${drive}${secondaryText}, conflict ${conflict.toFixed(2)}`);
  lines.push(`Development: ${stageName}`);

  if (Array.isArray(awareness) && awareness.length > 0) {
    lines.push(`Self-awareness: ${awareness.join('; ')}`);
  }

  const socialText = socialModel && state.lastAuthor ? socialModel.toPromptText(state.lastAuthor) : '';
  if (socialText) {
    lines.push(socialText);
  }

  lines.push(`Prediction: uncertainty ${uncertainty.toFixed(2)}`);

  return lines.join('\n');
}

module.exports = { generatePromptInjection };
