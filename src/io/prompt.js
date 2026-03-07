function signed(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function generatePromptInjection(state) {
  const mood = state.mood || {};
  const vec = mood.vector || state.moodVector || { valence: 0, arousal: 0, dominance: 0, sociality: 0 };
  const label = mood.label || state.moodLabel?.label || 'neutral';
  const drive = state.drive || 'stable baseline';

  return (
    `[Thymos State]\n` +
    `Mood: ${label} (V:${signed(vec.valence)} A:${signed(vec.arousal)} D:${signed(vec.dominance)} S:${signed(vec.sociality)})\n` +
    `Drive: ${drive}`
  );
}

module.exports = { generatePromptInjection };
