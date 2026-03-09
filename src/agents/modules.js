/**
 * modules.js — 12개 특화 모듈 정의
 * GWT Phase 1: 3개 에이전트 → 12개 특화 모듈
 */

const MODULE_REGISTRY = {
  // 기존 3개
  id: {
    type: 'drive',
    nmSensitive: ['dopamine', 'norepinephrine'],
    description: '충동적 욕구, 즉각적 만족 추구',
  },
  ego: {
    type: 'executive',
    nmSensitive: ['acetylcholine', 'gaba'],
    description: '현실 기반 실행, 균형 추구',
  },
  superego: {
    type: 'normative',
    nmSensitive: ['serotonin'],
    description: '도덕적 제약, 규범 준수',
  },

  // 신규 9개
  threat: {
    type: 'vigilance',
    nmSensitive: ['cortisol', 'norepinephrine'],
    description: '위협 감지, 생존 우선순위',
  },
  reward: {
    type: 'motivation',
    nmSensitive: ['dopamine'],
    description: '보상 추구, 목표 지향',
  },
  social: {
    type: 'bonding',
    nmSensitive: ['oxytocin', 'serotonin'],
    description: '사회적 연결, 관계 유지',
  },
  memory_mod: {
    type: 'episodic',
    nmSensitive: ['acetylcholine'],
    description: '과거 경험 회상 및 적용',
  },
  creative: {
    type: 'generative',
    nmSensitive: ['dopamine', 'acetylcholine'],
    description: '새로운 연결, 창의적 반응',
  },
  fatigue: {
    type: 'homeostatic',
    nmSensitive: ['gaba', 'serotonin'],
    description: '에너지 보존, 단순화 압박',
  },
  curiosity: {
    type: 'exploratory',
    nmSensitive: ['dopamine', 'norepinephrine'],
    description: '정보 탐색, 질문 생성',
  },
  empathy: {
    type: 'social_cog',
    nmSensitive: ['oxytocin'],
    description: '공감적 반응, 상대방 감정 추론',
  },
  skeptic: {
    type: 'critical',
    nmSensitive: ['cortisol', 'acetylcholine'],
    description: '비판적 검토, 신중함',
  },
};

// 모듈 간 협력(+)/경쟁(-) 매트릭스
// 방송 피드백 시 승자가 다른 모듈 변조에 사용
const MODULE_AFFINITY = {
  id:         { ego: -0.3, superego: -0.4, threat: 0.1, reward: 0.5, social: 0.2, memory_mod: 0, creative: 0.3, fatigue: -0.5, curiosity: 0.3, empathy: 0.1, skeptic: -0.2 },
  ego:        { id: -0.2, superego: 0.1, threat: 0.2, reward: 0.1, social: 0.2, memory_mod: 0.3, creative: 0.2, fatigue: 0.1, curiosity: 0.2, empathy: 0.2, skeptic: 0.3 },
  superego:   { id: -0.4, ego: 0.2, threat: 0.1, reward: -0.2, social: 0.3, memory_mod: 0.2, creative: -0.1, fatigue: 0.2, curiosity: 0, empathy: 0.4, skeptic: 0.3 },
  threat:     { id: 0.2, ego: 0.1, superego: 0, reward: -0.3, social: -0.4, memory_mod: 0.2, creative: -0.4, fatigue: 0.3, curiosity: -0.3, empathy: -0.2, skeptic: 0.5 },
  reward:     { id: 0.4, ego: 0, superego: -0.2, threat: -0.3, social: 0.2, memory_mod: 0.1, creative: 0.4, fatigue: -0.4, curiosity: 0.4, empathy: 0.1, skeptic: -0.1 },
  social:     { id: 0.1, ego: 0.2, superego: 0.3, threat: -0.4, reward: 0.2, memory_mod: 0.3, creative: 0.2, fatigue: -0.1, curiosity: 0.1, empathy: 0.6, skeptic: -0.1 },
  memory_mod: { id: 0, ego: 0.3, superego: 0.2, threat: 0.2, reward: 0.1, social: 0.3, creative: 0.3, fatigue: 0.1, curiosity: 0.2, empathy: 0.2, skeptic: 0.2 },
  creative:   { id: 0.3, ego: 0.1, superego: -0.1, threat: -0.4, reward: 0.4, social: 0.2, memory_mod: 0.3, fatigue: -0.5, curiosity: 0.5, empathy: 0.2, skeptic: -0.2 },
  fatigue:    { id: -0.5, ego: 0.1, superego: 0.2, threat: 0.1, reward: -0.4, social: -0.1, memory_mod: 0.1, creative: -0.5, curiosity: -0.4, empathy: -0.1, skeptic: 0.1 },
  curiosity:  { id: 0.2, ego: 0.2, superego: 0, threat: -0.3, reward: 0.4, social: 0.1, memory_mod: 0.2, creative: 0.5, fatigue: -0.4, empathy: 0.1, skeptic: 0.2 },
  empathy:    { id: 0.1, ego: 0.2, superego: 0.4, threat: -0.2, reward: 0.1, social: 0.6, memory_mod: 0.2, creative: 0.2, fatigue: -0.1, curiosity: 0.1, skeptic: -0.1 },
  skeptic:    { id: -0.2, ego: 0.3, superego: 0.3, threat: 0.5, reward: -0.1, social: -0.1, memory_mod: 0.2, creative: -0.2, fatigue: 0.1, curiosity: 0.2, empathy: -0.1 },
};

/**
 * 현재 신경조절물질 상태에서 각 모듈의 활성화 점수 계산
 */
function computeModuleActivations(nmState, devStage) {
  const activations = {};
  const volatility = devStage?.getVolatility?.() || 1.0;

  for (const [name, mod] of Object.entries(MODULE_REGISTRY)) {
    let score = 0;
    let count = 0;

    for (const nmName of mod.nmSensitive) {
      const nm = nmState[nmName];
      if (!nm) continue;
      const value = typeof nm === 'object' ? nm.value : nm;
      score += value / 100;
      count++;
    }

    activations[name] = count > 0 ? (score / count) * volatility : 0;
  }

  return activations;
}

/**
 * 모듈 활성화 점수 → 행동 제안 텍스트
 */
function moduleToSuggestion(moduleName, activation) {
  const suggestions = {
    id:         activation > 0.7 ? '충동적으로 행동하자!' : '뭔가 하고 싶다',
    ego:        activation > 0.7 ? '차분하게 처리하자' : '균형 잡힌 접근',
    superego:   activation > 0.7 ? '원칙대로 하자' : '규범을 지키자',
    threat:     activation > 0.7 ? '조심해야 한다' : '경계 유지',
    reward:     activation > 0.7 ? '보상을 향해!' : '목표 달성 집중',
    social:     activation > 0.7 ? '연결하고 싶다' : '함께하자',
    memory_mod: activation > 0.7 ? '이전에도 이런 적 있었어' : '경험 참조',
    creative:   activation > 0.7 ? '새롭게 접근해보자!' : '창의적 시각',
    fatigue:    activation > 0.7 ? '쉬고 싶다' : '에너지 절약',
    curiosity:  activation > 0.7 ? '더 알고 싶어!' : '탐구하자',
    empathy:    activation > 0.7 ? '상대방 마음이 느껴진다' : '공감적 접근',
    skeptic:    activation > 0.7 ? '정말 그럴까?' : '신중하게 검토',
  };
  return suggestions[moduleName] || '안정적 처리';
}

module.exports = { MODULE_REGISTRY, MODULE_AFFINITY, computeModuleActivations, moduleToSuggestion };
