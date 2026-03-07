const { clamp } = require('../utils/math');

function attentionGate(stimulusProfile, currentMoodVector) {
  const mood = currentMoodVector || { valence: 0, arousal: 0 };
  const valence = Number(mood.valence || 0);
  const arousal = Number(mood.arousal || 0);
  const stimValence = Number(stimulusProfile.valence || 0);

  let amplification = 1;

  if (valence < -0.3 && stimValence < 0) {
    amplification *= 1 + Math.abs(valence) * 0.5;
  } else if (valence > 0.3 && stimValence > 0) {
    amplification *= 1 + valence * 0.3;
  } else if (valence < -0.3 && stimValence > 0) {
    amplification *= 0.7;
  }

  if (arousal > 0.5) {
    amplification *= 1 + (arousal - 0.5) * 0.6;
  } else if (arousal < -0.3 && Number(stimulusProfile.intensity || 0) < 0.3) {
    amplification *= 0.5;
  }

  return {
    ...stimulusProfile,
    intensity: clamp(Number(stimulusProfile.intensity || 0) * amplification, 0, 1),
    amplification,
  };
}

module.exports = { attentionGate };
