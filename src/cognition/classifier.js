const { clamp } = require('../utils/math');

class StimulusClassifier {
  classify(stimulus) {
    const normalized = normalizeStimulus(stimulus);

    if (normalized.type === 'system') {
      return this.classifyByRule(normalized);
    }

    if (normalized.type === 'message') {
      return this.fallbackKeywordClassify(normalized.content);
    }

    if (normalized.subtype) {
      return this.classifyByRule(normalized);
    }

    return this.fallbackKeywordClassify(normalized.content);
  }

  classifyByRule(stimulus) {
    const subtype = String(stimulus.subtype || '').toLowerCase();

    const rules = {
      task_success: {
        valence: 0.6,
        arousal: 0.3,
        category: 'achievement',
        intensity: 0.6,
        social_signal: 'approach',
      },
      task_failure: {
        valence: -0.5,
        arousal: 0.5,
        category: 'failure',
        intensity: 0.7,
        social_signal: 'withdraw',
      },
      error: {
        valence: -0.4,
        arousal: 0.6,
        category: 'error',
        intensity: 0.7,
        social_signal: 'withdraw',
      },
      heartbeat: {
        valence: 0,
        arousal: -0.1,
        category: 'idle',
        intensity: 0.2,
        social_signal: 'neutral',
      },
      long_silence: {
        valence: -0.2,
        arousal: -0.2,
        category: 'abandonment',
        intensity: 0.4,
        social_signal: 'withdraw',
      },
      urgent_request: {
        valence: -0.1,
        arousal: 0.8,
        category: 'urgency',
        intensity: 0.9,
        social_signal: 'approach',
      },
      conversation_start: {
        valence: 0.3,
        arousal: 0.2,
        category: 'social',
        intensity: 0.5,
        social_signal: 'approach',
      },
      night_mode: {
        valence: 0,
        arousal: -0.5,
        category: 'circadian',
        intensity: 0.4,
        social_signal: 'neutral',
      },
    };

    return withDefaults(rules[subtype] || {
      valence: 0,
      arousal: 0,
      category: 'neutral',
      intensity: 0.2,
      social_signal: 'neutral',
    });
  }

  fallbackKeywordClassify(text) {
    const value = String(text || '');

    // Multilingual keyword patterns (KO/EN/JA/ZH/ES)
    const humor = /ㅋㅋㅋ|ㅎㅎㅎ|웃기|장난|lol|lmao|rofl|haha|funny|hilarious|笑|草|ワロタ|jaja|🤣|😂/i;
    const positive = /칭찬|잘했|고마|좋아|대단|멋지|최고|사랑|ㅋㅋ|ㅎㅎ|great|good\s?job|awesome|nice|excellent|amazing|fantastic|wonderful|well\s?done|perfect|brilliant|thank|love|すごい|素晴らしい|ありがとう|太好了|厉害|谢谢|棒|genial|increíble|gracias|👍|❤️|😊|🎉|💪|🙌/i;
    const negative = /비판|왜그래|별로|실망|짜증|못해|이상해|화나|bad|terrible|awful|wrong|horrible|disappointed|annoying|stupid|worst|sucks|hate|ugly|ダメ|ひどい|最悪|失望|糟糕|差劲|讨厌|terrible|malo|😡|😤|👎/i;
    const encouragement = /응원|할 수 있|힘내|파이팅|괜찮아|you can|keep going|don't give up|believe|go for it|頑張|加油|ánimo/i;
    const affection = /사랑해|보고싶|안아|고생했|수고했|love you|miss you|proud of you|care about|大好き|爱你|想你|te quiero/i;
    const concern = /괜찮아\?|무슨 일|걱정|아프|힘들|are you ok|you alright|what happened|worried|大丈夫|没事吧|estás bien/i;
    const question = /\?|왜|어떻게|뭐야|무엇|언제|어디|why|how|what|when|where|who|なぜ|什么|为什么|por qué|cómo/i;
    const command = /해줘|해라|지금|빨리|당장|반드시|해야|do it|right now|immediately|hurry|must|asap|すぐ|马上|hazlo|ahora/i;

    if (humor.test(value)) {
      return withDefaults({ valence: 0.4, arousal: 0.3, category: 'humor', intensity: 0.4, social_signal: 'approach' });
    }
    if (affection.test(value)) {
      return withDefaults({ valence: 0.7, arousal: 0.2, category: 'affection', intensity: 0.6, social_signal: 'approach' });
    }
    if (encouragement.test(value)) {
      return withDefaults({ valence: 0.5, arousal: 0.2, category: 'encouragement', intensity: 0.5, social_signal: 'approach' });
    }
    if (positive.test(value)) {
      return withDefaults({ valence: 0.6, arousal: 0.2, category: 'praise', intensity: 0.5, social_signal: 'approach' });
    }
    if (negative.test(value)) {
      // Fix #2: 비판 intensity 0.5→0.7, valence -0.5→-0.7, arousal 0.4→0.6
      return withDefaults({ valence: -0.7, arousal: 0.6, category: 'criticism', intensity: 0.7, social_signal: 'withdraw' });
    }
    if (concern.test(value)) {
      return withDefaults({ valence: 0.1, arousal: 0.2, category: 'concern', intensity: 0.4, social_signal: 'approach' });
    }
    if (command.test(value)) {
      return withDefaults({ valence: -0.1, arousal: 0.4, category: 'command', intensity: 0.5, social_signal: 'neutral' });
    }
    if (question.test(value)) {
      return withDefaults({ valence: 0, arousal: 0.1, category: 'question', intensity: 0.3, social_signal: 'neutral' });
    }

    return withDefaults({ valence: 0, arousal: 0, category: 'neutral', intensity: 0.2, social_signal: 'neutral' });
  }
}

function stimulusToNeuromodulators(profile) {
  const valence = clamp(Number(profile.valence || 0), -1, 1);
  const arousal = clamp(Number(profile.arousal || 0), -1, 1);
  const category = profile.category || 'neutral';
  const intensity = clamp(Number(profile.intensity || 0.5), 0, 1);
  const socialSignal = profile.social_signal || 'neutral';

  const deltas = {
    dopamine: valence * 20 * intensity,
    cortisol: (-valence * 15 + arousal * 10) * intensity,
    serotonin: valence * 12 * intensity,
    oxytocin: 0,
    norepinephrine: arousal * 20 * intensity,
    gaba: -arousal * 10 * intensity,
    acetylcholine: 0,
  };

  const categoryMods = {
    praise: { dopamine: 10, serotonin: 8, oxytocin: 12 },
    criticism: { cortisol: 25, serotonin: -15, dopamine: -15, oxytocin: -8, gaba: -5 },
    humor: { dopamine: 8, serotonin: 5, oxytocin: 6, gaba: 5 },
    affection: { oxytocin: 18, serotonin: 8, gaba: 5 },
    encouragement: { dopamine: 12, serotonin: 6 },
    frustration: { cortisol: 15, norepinephrine: 10, gaba: -8 },
    teasing: { dopamine: 5, oxytocin: 4, norepinephrine: 3 },
    question: { acetylcholine: 8, norepinephrine: 3 },
    command: { norepinephrine: 5, acetylcholine: 5 },
    concern: { oxytocin: 8, cortisol: 5 },
    urgency: { norepinephrine: 20, cortisol: 15, acetylcholine: 10 },
    achievement: { dopamine: 20, serotonin: 8 },
    failure: { cortisol: 15, dopamine: -12, serotonin: -5 },
    error: { cortisol: 10, norepinephrine: 12, dopamine: -5 },
    abandonment: { cortisol: 8, oxytocin: -5, serotonin: -6 },
    idle: {},
    neutral: { serotonin: 2, oxytocin: 3 },
  };

  const mods = categoryMods[category] || {};
  for (const [name, mod] of Object.entries(mods)) {
    deltas[name] = (deltas[name] || 0) + mod * intensity;
  }

  if (socialSignal === 'approach') {
    deltas.oxytocin += 5 * intensity;
  } else if (socialSignal === 'withdraw') {
    deltas.oxytocin -= 5 * intensity;
  }

  return deltas;
}

function withDefaults(profile) {
  return {
    valence: clamp(Number(profile.valence || 0), -1, 1),
    arousal: clamp(Number(profile.arousal || 0), -1, 1),
    category: profile.category || 'neutral',
    intensity: clamp(Number(profile.intensity || 0.2), 0, 1),
    social_signal: profile.social_signal || 'neutral',
  };
}

function normalizeStimulus(stimulus) {
  const value = stimulus || {};
  return {
    type: value.type || 'message',
    subtype: value.subtype || '',
    content: value.content || '',
    author: value.author || '',
  };
}

module.exports = {
  StimulusClassifier,
  stimulusToNeuromodulators,
};
