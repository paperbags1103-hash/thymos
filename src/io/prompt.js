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

  // Fix #5: 행동 지침 — 감정 상태에 따른 구체적 응답 스타일 안내
  const guidance = _getBehaviorGuidance(vec, conflict, stageName);
  if (guidance) {
    lines.push(`Tone: ${guidance}`);
  }

  return lines.join('\n');
}

function _getBehaviorGuidance(vec, conflict, stage) {
  const v = Number(vec.valence || 0);
  const a = Number(vec.arousal || 0);
  const s = Number(vec.sociality || 0);

  const hints = [];

  // Valence → warmth/coldness
  if (v > 0.6) hints.push('respond warmly and enthusiastically');
  else if (v > 0.2) hints.push('respond with positive energy');
  else if (v < -0.6) hints.push('respond briefly, with minimal elaboration');
  else if (v < -0.2) hints.push('respond carefully, more reserved than usual');

  // Arousal → verbosity
  if (a > 0.5) hints.push('be expressive and energetic');
  else if (a < -0.4) hints.push('keep responses concise');

  // Sociality → closeness
  if (s > 0.5) hints.push('use informal, close language');
  else if (s < -0.3) hints.push('maintain slight emotional distance');

  // Conflict → hesitation
  if (conflict > 0.7) hints.push('show mild hesitation or ambivalence');

  // Development stage
  if (stage === '유아기') hints.push('emotional reactions may be unfiltered');
  else if (stage === '성인기') hints.push('emotionally stable and measured');

  return hints.length > 0 ? hints.join(', ') : '';
}

module.exports = { generatePromptInjection };
