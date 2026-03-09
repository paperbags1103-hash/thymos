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
  lines.push('[Inner State]');
  lines.push(`Feeling: ${label} (V:${signed(vec.valence)} A:${signed(vec.arousal)} D:${signed(vec.dominance)} S:${signed(vec.sociality)})`);
  lines.push(`Impulse: ${drive}${secondaryText}, tension ${conflict.toFixed(2)}`);
  lines.push(`Growth: ${stageName}`);

  if (Array.isArray(awareness) && awareness.length > 0) {
    lines.push(`Self-awareness: ${awareness.join('; ')}`);
  }

  const socialText = socialModel && state.lastAuthor ? socialModel.toPromptText(state.lastAuthor) : '';
  if (socialText) {
    lines.push(socialText);
  }

  lines.push(`Uncertainty: ${uncertainty.toFixed(2)}`);

  // v2: 내러티브 자아
  const selfConcept = state.narrative?.selfConcept;
  if (selfConcept?.dominantMood) {
    const narrativeParts = [];
    narrativeParts.push(`Self-concept: usually ${selfConcept.dominantMood}`);
    if (selfConcept.recentChapter && selfConcept.recentChapter !== selfConcept.dominantMood) {
      narrativeParts.push(`recently ${selfConcept.recentChapter}`);
    }
    if (selfConcept.dominantDrive) {
      narrativeParts.push(`drive: ${selfConcept.dominantDrive}`);
    }
    lines.push(narrativeParts.join(', '));
  }

  // v2: 에너지 상태
  const energyLevel = state.energy?.level;
  if (energyLevel === 'exhausted') lines.push('Energy: exhausted — keep responses very brief');
  else if (energyLevel === 'tired') lines.push('Energy: low — concise responses preferred');
  else if (energyLevel === 'energized') lines.push('Energy: high — fully engaged');

  // v2: 항상성 드라이브
  const homeoAction = state.homeostasisDrives ? _getHomeostaticHint(state.homeostasisDrives) : '';
  if (homeoAction) lines.push(`Internal drive: ${homeoAction}`);

  // v2: 점화 여부 (기술 용어 숨김)
  const ignited = state.ignited;
  if (ignited && state.gwt?.winner) {
    lines.push(`Intensity: heightened — this moment calls for full presence`);
  }

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

function _getHomeostaticHint(drives) {
  if (!drives) return '';
  const strongest = Object.entries(drives)
    .filter(([, v]) => Math.abs(v) > 0.28)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0];
  if (!strongest) return '';
  const [nm, drive] = strongest;
  if (nm === 'dopamine' && drive > 0) return 'seek engagement';
  if (nm === 'cortisol' && drive < 0) return 'seek calm';
  if (nm === 'oxytocin' && drive > 0) return 'seek connection';
  if (nm === 'serotonin' && drive > 0) return 'seek positive interaction';
  return drive > 0 ? 'engage more' : 'rest and recover';
}

module.exports = { generatePromptInjection };
