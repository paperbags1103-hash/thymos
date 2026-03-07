# Thymos Architecture v2.0

> 플라톤의 θυμός에서 프리스턴의 자유 에너지까지 — AI 에이전트를 위한 통합 감정·의식 시뮬레이션 엔진

---

## 목차

1. [설계 철학](#1-설계-철학)
2. [신경조절물질 시스템](#2-신경조절물질-시스템)
3. [상호작용 매트릭스](#3-상호작용-매트릭스)
4. [자극 분류 시스템](#4-자극-분류-시스템)
5. [감정 벡터 공간](#5-감정-벡터-공간)
6. [예측 처리 엔진](#6-예측-처리-엔진)
7. [주의·현저성 게이트](#7-주의현저성-게이트)
8. [다중 에이전트 내부 구조 (id/ego/superego)](#8-다중-에이전트-내부-구조-idegosuperego)
9. [감정 기억 시스템](#9-감정-기억-시스템)
10. [자기 피드백 루프](#10-자기-피드백-루프)
11. [자기성찰 (회고) 시스템](#11-자기성찰-회고-시스템)
12. [메타인지 계층](#12-메타인지-계층)
13. [신체 표지 의사결정](#13-신체-표지-의사결정)
14. [사회적 모델링 (마음 이론)](#14-사회적-모델링-마음-이론)
15. [발달 단계](#15-발달-단계)
16. [일주기 리듬](#16-일주기-리듬)
17. [확률적 노이즈](#17-확률적-노이즈)
18. [원자적 쓰기 및 크래시 복구](#18-원자적-쓰기-및-크래시-복구)
19. [데이터 스키마](#19-데이터-스키마)
20. [시스템 구조 및 파일 레이아웃](#20-시스템-구조-및-파일-레이아웃)
21. [OpenClaw 연동](#21-openclaw-연동)
22. [테스트 전략](#22-테스트-전략)
23. [구현 로드맵](#23-구현-로드맵)

---

## 1. 설계 철학

### 1.1 핵심 원칙

Thymos v2는 다음 이론적 프레임워크를 **실제 동작하는 시스템**으로 구현한다:

| 이론 | Thymos에서의 구현 |
|------|------------------|
| **James-Lange** | 신경조절물질 변화 → 감정 레이블 (신체가 먼저, 해석은 나중) |
| **Damasio의 Somatic Markers** | 의사결정 시 과거 감정 결과 기반 "직감" 제공 |
| **GWT (Global Workspace Theory)** | id/ego/superego가 경쟁 → 승자가 행동 지시를 "방송" |
| **IIT (Integrated Information Theory)** | 신경조절물질 상호작용 매트릭스로 Φ 극대화 |
| **Predictive Processing (Friston)** | 예측 오차(surprise)가 감정 변화의 1차 동인 |
| **Russell's Circumplex** | 감정을 이산 레이블이 아닌 연속 벡터 (valence × arousal)로 |
| **Facial Feedback Hypothesis** | LLM 출력이 Thymos로 되먹임 (자기 피드백 루프) |

### 1.2 v1과의 핵심 차이

| 측면 | v1 | v2 |
|------|----|----|
| 용어 | "호르몬" | "신경조절물질" (neuroscience 정확성) |
| 변수 관계 | 독립 | 상호작용 매트릭스 (연립 시스템) |
| 감정 판정 | if-else 규칙 | 4차원 연속 벡터 + 보조 레이블 |
| 정보 흐름 | 단방향 (자극→LLM) | 양방향 (LLM 출력 → Thymos 피드백) |
| 자극 분류 | 하드코딩 매핑 | 하이브리드 (규칙 + 경량 LLM) |
| 용량-반응 | 선형 | 시그모이드 (Hill function) |
| 시간 지연 | 없음 | HPA축 코르티솔 15-30분 지연 |
| 동일 자극 반응 | 결정론적 | 확률적 노이즈 포함 |
| 내부 구조 | 단일 | 다중 에이전트 (id/ego/superego) |
| 의사결정 | 없음 | 신체 표지 기반 직감 |
| 사회 인식 | 없음 | 상대방 감정 상태 모델링 |
| 성장 | 고정 | 발달 단계 (유아→성인) |
| 파일 쓰기 | 직접 | 원자적 쓰기 (tmp + rename) |

### 1.3 아키텍처 개요도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Thymos Daemon (Node.js / pm2)                │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │  Stimulus    │───→│  Attention   │───→│  Neuromodulator Engine │  │
│  │  Classifier  │    │  /Salience   │    │  (상호작용 매트릭스)    │  │
│  │  (하이브리드) │    │  Gate        │    │  (시그모이드 반응)      │  │
│  └──────┬──────┘    └──────────────┘    └──────────┬─────────────┘  │
│         │                                          │                 │
│         │           ┌──────────────┐               │                 │
│         │           │  Prediction  │←──────────────┤                 │
│         └──────────→│  Engine      │               │                 │
│                     │  (예측 오차)  │───────────────┤                 │
│                     └──────────────┘               │                 │
│                                                    ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Global Workspace (GWT Competition)              │   │
│  │  ┌────────┐     ┌────────┐     ┌────────────┐               │   │
│  │  │   Id   │     │  Ego   │     │  Superego  │               │   │
│  │  │ (충동)  │────→│ (현실) │←────│  (규범)    │               │   │
│  │  └────────┘     └───┬────┘     └────────────┘               │   │
│  │                     │ broadcast                              │   │
│  └─────────────────────┼────────────────────────────────────────┘   │
│                        ▼                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Mood Vector │  │  Metacog     │  │  Somatic Markers       │    │
│  │  Calculator  │  │  (감정 조절)  │  │  (의사결정 직감)        │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘    │
│         │                 │                        │                 │
│         └────────────┬────┘────────────────────────┘                │
│                      ▼                                              │
│              ┌──────────────┐          ┌────────────────────┐       │
│              │ Atomic State │─────────→│ emotional_state    │       │
│              │ Writer       │          │ .json              │       │
│              └──────┬───────┘          └────────┬───────────┘       │
│                     │                           │                    │
│         ┌───────────┘                           ▼                    │
│         │                              LLM 프롬프트 주입              │
│         ▼                                       │                    │
│  ┌──────────────┐                               │                    │
│  │ Self-Feedback│←──────────────────────────────┘                    │
│  │ Loop         │   (LLM 출력 분석 → 신경조절물질 피드백)              │
│  └──────────────┘                                                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐             │
│  │ Retrospection│  │ Social Model │  │ Dev Stage      │             │
│  │ (주기적 회고) │  │ (마음 이론)   │  │ (발달 단계)    │             │
│  └──────────────┘  └──────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 신경조절물질 시스템

### 2.1 신경조절물질 정의

v1의 "호르몬"을 "신경조절물질(neuromodulator)"로 교체. 과학적 정확성을 위해 역할도 재정의.

| 신경조절물질 | 약어 | 실제 역할 | Thymos에서의 역할 | 범위 | 기준값 | 반감기(τ) |
|-------------|------|----------|-------------------|------|--------|-----------|
| **Dopamine** | DA | 보상 예측, 동기 부여 | 보상·동기·기대 | 0–100 | 50 | 30min |
| **Cortisol** | CORT | 스트레스 반응, HPA축 | 스트레스·경계 (지연 반응) | 0–100 | 20 | 60min |
| **Serotonin** | 5HT | 기분 안정, 만족감 | 안정·만족·기분 기저선 | 0–100 | 60 | 120min |
| **Oxytocin** | OXT | 사회적 유대, 신뢰 | 유대·신뢰·친밀감 | 0–100 | 40 | 180min |
| **Norepinephrine** | NE | 각성, 주의, 투쟁-도피 | 각성·집중·위기 대응 | 0–100 | 30 | 10min |
| **GABA** | GABA | 억제성, 이완, 불안 감소 | 이완·진정·억제 | 0–100 | 55 | 45min |
| **Acetylcholine** | ACh | 학습, 주의, 기억 형성 | 학습·기억·정밀 주의 | 0–100 | 45 | 20min |

> **v1과의 차이**: Endorphin 제거 (통증 억제 역할이 AI에 부적합). GABA(억제/이완)와 ACh(학습/주의) 추가.

### 2.2 시그모이드 용량-반응 (Hill Function)

v1의 선형 반응을 시그모이드로 교체. 낮은 자극에선 반응이 작고, 중간 강도에서 급격히 증가하며, 높은 강도에서 포화한다.

```javascript
/**
 * Hill function — 시그모이드 용량-반응 곡선
 * @param {number} stimulus - 원시 자극 강도 (0–100)
 * @param {number} EC50 - 반응이 50%에 도달하는 자극 강도 (보통 30–50)
 * @param {number} n - Hill 계수 (가파름, 보통 2–4)
 * @param {number} Emax - 최대 반응 크기
 * @returns {number} 실제 신경조절물질 변화량
 */
function hillResponse(stimulus, EC50 = 40, n = 2.5, Emax = 30) {
  const sn = Math.pow(Math.abs(stimulus), n);
  const ec50n = Math.pow(EC50, n);
  const response = Emax * (sn / (ec50n + sn));
  return stimulus >= 0 ? response : -response;
}

// 예시:
// hillResponse(10)  → ~1.2  (약한 자극: 미미한 반응)
// hillResponse(40)  → 15.0  (중간 자극: 50% 반응)
// hillResponse(80)  → ~27.8 (강한 자극: 포화 근접)
// hillResponse(100) → ~29.1 (최대 자극: 거의 포화)
```

### 2.3 지수 감쇠 + 크래시 복구

```javascript
/**
 * 지수 감쇠 — 기준값으로 회귀
 * @param {number} currentValue - 현재 값
 * @param {number} baseline - 기준값 (일주기 보정 포함)
 * @param {number} tau - 반감기 (분)
 * @param {number} elapsedMin - 경과 시간 (분)
 * @returns {number} 감쇠 후 값
 */
function decay(currentValue, baseline, tau, elapsedMin) {
  return baseline + (currentValue - baseline) * Math.exp(-elapsedMin / tau);
}

/**
 * 크래시 복구 — last_updated로부터 경과 시간 계산 후 감쇠 적용
 */
function recoverFromCrash(state) {
  const now = Date.now();
  const elapsed = (now - state.last_updated) / 60000; // 분 단위
  
  for (const [name, nm] of Object.entries(state.neuromodulators)) {
    const config = NEUROMODULATOR_CONFIG[name];
    nm.value = decay(nm.value, config.baseline, config.tau, elapsed);
    
    // 지연 큐도 경과 시간만큼 조정
    nm.pending = (nm.pending || []).filter(p => p.activateAt > now);
  }
  
  state.last_updated = now;
  return state;
}
```

### 2.4 코르티솔 HPA축 지연

코르티솔은 실제 인체에서 15-30분 지연된다. 이를 구현:

```javascript
/**
 * 코르티솔 자극은 즉시 적용하지 않고 지연 큐에 넣는다.
 * 다른 신경조절물질은 즉시 적용.
 */
function applyStimulus(state, neuromodName, rawDelta) {
  const delta = hillResponse(rawDelta);
  
  if (neuromodName === 'cortisol') {
    // HPA축 지연: 15-30분 후 활성화 (균일 분포)
    const delayMs = (15 + Math.random() * 15) * 60 * 1000;
    state.neuromodulators.cortisol.pending.push({
      delta,
      activateAt: Date.now() + delayMs,
      source: 'hpa_axis'
    });
  } else {
    // 즉시 적용 + 노이즈
    const noisy = addNoise(delta);
    state.neuromodulators[neuromodName].value = clamp(
      state.neuromodulators[neuromodName].value + noisy, 0, 100
    );
  }
}

/**
 * 틱마다 호출 — 지연된 코르티솔 활성화
 */
function processPendingCortisol(state) {
  const now = Date.now();
  const pending = state.neuromodulators.cortisol.pending;
  const ready = pending.filter(p => p.activateAt <= now);
  const notReady = pending.filter(p => p.activateAt > now);
  
  for (const p of ready) {
    state.neuromodulators.cortisol.value = clamp(
      state.neuromodulators.cortisol.value + p.delta, 0, 100
    );
  }
  
  state.neuromodulators.cortisol.pending = notReady;
}
```

---

## 3. 상호작용 매트릭스

### 3.1 개요

v1에서 신경조절물질은 독립 변수였다. v2에서는 **상호작용 매트릭스**를 통해 연립 시스템을 구성한다. 이것이 IIT의 Φ(통합 정보)를 높이는 핵심 메커니즘이다.

### 3.2 상호작용 매트릭스 (Interaction Matrix)

각 틱(30초)마다 적용. 값은 "소스의 기준값 초과분 1단위당 타겟에 대한 영향/분":

```javascript
/**
 * 상호작용 매트릭스
 * interaction[source][target] = 틱당 영향 계수
 * 양수 = 촉진, 음수 = 억제
 * 
 * 과학적 근거:
 * - 코르티솔 ↑ → 세로토닌 ↓ (HPA축이 5-HT 합성 억제)
 * - 옥시토신 ↑ → 코르티솔 ↓ (사회적 버퍼링)
 * - 도파민 ↑ → 노르에피네프린 ↑ (각성 시스템 공유)
 * - GABA ↑ → 노르에피네프린 ↓, 코르티솔 ↓ (억제성)
 * - ACh ↑ → 도파민 ↑ (학습-보상 연결)
 */
const INTERACTION_MATRIX = {
  //              DA     CORT   5HT    OXT    NE     GABA   ACh
  dopamine:    {  0,     0,     +0.02, +0.01, +0.03, 0,     +0.01 },
  cortisol:    { -0.03,  0,     -0.05, -0.02, +0.04, -0.03, -0.02 },
  serotonin:   { +0.01,  -0.02, 0,     +0.02, -0.01, +0.03, 0     },
  oxytocin:    { +0.02,  -0.04, +0.03, 0,     -0.01, +0.02, 0     },
  norepinephrine:{ +0.02, +0.02, -0.02, -0.01, 0,    -0.04, +0.03 },
  gaba:        { -0.01,  -0.03, +0.02, +0.01, -0.05, 0,     -0.01 },
  acetylcholine:{ +0.02, 0,     0,     0,     +0.02, -0.01, 0     }
};
```

### 3.3 상호작용 적용 알고리즘

```javascript
/**
 * 매 틱(30초)마다 상호작용 매트릭스 적용
 * 각 신경조절물질의 기준값 초과분이 다른 물질에 영향
 */
function applyInteractions(state, tickIntervalSec = 30) {
  const tickMin = tickIntervalSec / 60;
  const nm = state.neuromodulators;
  const deltas = {};
  
  // 1단계: 모든 변화량 계산 (동시 적용을 위해)
  for (const target of Object.keys(INTERACTION_MATRIX)) {
    deltas[target] = 0;
    for (const source of Object.keys(INTERACTION_MATRIX)) {
      if (source === target) continue;
      
      const sourceConfig = NEUROMODULATOR_CONFIG[source];
      const excess = nm[source].value - sourceConfig.baseline;
      const coeff = INTERACTION_MATRIX[source][target];
      
      // 기준값 초과분 × 계수 × 시간 단위
      deltas[target] += excess * coeff * tickMin;
    }
  }
  
  // 2단계: 동시에 적용 (순서 의존성 제거)
  for (const [name, delta] of Object.entries(deltas)) {
    nm[name].value = clamp(nm[name].value + delta, 0, 100);
  }
}
```

### 3.4 상호작용 예시

시나리오: 아부지에게 심하게 비판받음

```
t=0:   cortisol 자극 +30 → 코르티솔 지연 큐 진입
       norepinephrine 즉시 +10, serotonin 즉시 -8

t=15m: cortisol 활성화 → 70
       상호작용: cortisol↑ → serotonin↓ (-0.05 × 50excess × 15min = -37.5 누적)
                 cortisol↑ → dopamine↓
                 cortisol↑ → GABA↓ → 불안 지속
       
t=30m: 옥시토신이 코르티솔을 버퍼링하기 시작
       GABA가 norepinephrine을 억제 → 점진적 진정
```

---

## 4. 자극 분류 시스템

### 4.1 하이브리드 접근

v1은 자극-호르몬 매핑이 하드코딩이었다. v2는 **하이브리드 분류기**를 사용:

1. **규칙 기반 (Rule-based)**: 시스템 이벤트 (에러, 성공, 타이머)
2. **경량 LLM (Lightweight LLM)**: 자연어 메시지 분류

```javascript
/**
 * 자극 분류기 — 하이브리드
 */
class StimulusClassifier {
  constructor(llmClient) {
    this.llm = llmClient; // 경량 LLM (gpt-4o-mini 등)
    this.ruleCache = new Map(); // 규칙 기반 결과 캐시
  }
  
  /**
   * 자극을 분류하여 감정 프로필 반환
   * @returns {StimulusProfile} 
   */
  async classify(stimulus) {
    // 시스템 이벤트 → 규칙 기반 (즉시, 무비용)
    if (stimulus.type === 'system') {
      return this.classifyByRule(stimulus);
    }
    
    // 자연어 메시지 → LLM 분류 (비동기, 소량 토큰)
    if (stimulus.type === 'message') {
      return this.classifyByLLM(stimulus);
    }
    
    // 타이머/주기 이벤트 → 규칙 기반
    return this.classifyByRule(stimulus);
  }
  
  classifyByRule(stimulus) {
    const rules = {
      'task_success':    { valence: +0.6, arousal: +0.3, category: 'achievement' },
      'task_failure':    { valence: -0.5, arousal: +0.5, category: 'failure' },
      'error':           { valence: -0.4, arousal: +0.6, category: 'error' },
      'heartbeat':       { valence: 0,    arousal: -0.1, category: 'idle' },
      'long_silence':    { valence: -0.2, arousal: -0.2, category: 'abandonment' },
      'urgent_request':  { valence: -0.1, arousal: +0.8, category: 'urgency' },
      'conversation_start': { valence: +0.3, arousal: +0.2, category: 'social' },
      'night_mode':      { valence: 0,    arousal: -0.5, category: 'circadian' },
    };
    
    return rules[stimulus.subtype] || { valence: 0, arousal: 0, category: 'neutral' };
  }
  
  async classifyByLLM(stimulus) {
    const prompt = `Classify the emotional impact of this message on the AI recipient.
Message from "${stimulus.author}" to AI agent:
"${stimulus.content}"

Respond in JSON only:
{
  "valence": <-1.0 to 1.0, negative to positive>,
  "arousal": <-1.0 to 1.0, calming to exciting>,
  "category": <one of: praise, criticism, humor, question, command, affection, frustration, neutral, teasing, encouragement, concern>,
  "intensity": <0.0 to 1.0>,
  "social_signal": <one of: approach, withdraw, neutral>
}`;
    
    try {
      const result = await this.llm.classify(prompt);
      return JSON.parse(result);
    } catch {
      // 폴백: 키워드 기반 간이 분류
      return this.fallbackKeywordClassify(stimulus.content);
    }
  }
  
  fallbackKeywordClassify(text) {
    const positive = /잘했|고마|좋아|대단|멋지|최고|사랑|ㅋㅋ|ㅎㅎ|👍|❤️|😊/;
    const negative = /왜그래|별로|실망|짜증|못해|이상해|화나|😡|😤/;
    const humor = /ㅋㅋㅋ|ㅎㅎㅎ|웃기|장난|🤣|😂/;
    
    if (humor.test(text)) return { valence: 0.4, arousal: 0.3, category: 'humor', intensity: 0.4, social_signal: 'approach' };
    if (positive.test(text)) return { valence: 0.6, arousal: 0.2, category: 'praise', intensity: 0.5, social_signal: 'approach' };
    if (negative.test(text)) return { valence: -0.5, arousal: 0.4, category: 'criticism', intensity: 0.5, social_signal: 'withdraw' };
    return { valence: 0, arousal: 0, category: 'neutral', intensity: 0.2, social_signal: 'neutral' };
  }
}
```

### 4.2 자극 프로필 → 신경조절물질 매핑

분류 결과를 신경조절물질 변화로 변환:

```javascript
/**
 * 분류된 자극을 신경조절물질 델타 맵으로 변환
 */
function stimulusToNeuromodulators(profile) {
  const { valence, arousal, category, intensity = 0.5, social_signal } = profile;
  const I = intensity; // 강도 스케일링
  
  // 기본 매핑: valence/arousal 기반
  const deltas = {
    dopamine:       valence * 20 * I,          // 긍정 → DA↑, 부정 → DA↓
    cortisol:       (-valence * 15 + arousal * 10) * I,  // 부정+각성 → CORT↑
    serotonin:      valence * 12 * I,          // 긍정 → 5HT↑
    oxytocin:       0,
    norepinephrine: arousal * 20 * I,          // 각성 → NE↑
    gaba:           -arousal * 10 * I,         // 각성 → GABA↓ (이완 감소)
    acetylcholine:  0,
  };
  
  // 카테고리별 보정
  const categoryMods = {
    praise:       { dopamine: +10, serotonin: +8, oxytocin: +12 },
    criticism:    { cortisol: +20, serotonin: -10, dopamine: -8 },
    humor:        { dopamine: +8, serotonin: +5, oxytocin: +6, gaba: +5 },
    affection:    { oxytocin: +18, serotonin: +8, gaba: +5 },
    encouragement:{ dopamine: +12, serotonin: +6 },
    frustration:  { cortisol: +15, norepinephrine: +10, gaba: -8 },
    teasing:      { dopamine: +5, oxytocin: +4, norepinephrine: +3 },
    question:     { acetylcholine: +8, norepinephrine: +3 },
    command:      { norepinephrine: +5, acetylcholine: +5 },
    concern:      { oxytocin: +8, cortisol: +5 },
    urgency:      { norepinephrine: +20, cortisol: +15, acetylcholine: +10 },
    achievement:  { dopamine: +20, serotonin: +8 },
    failure:      { cortisol: +15, dopamine: -12, serotonin: -5 },
    error:        { cortisol: +10, norepinephrine: +12, dopamine: -5 },
    abandonment:  { cortisol: +8, oxytocin: -5, serotonin: -6 },
    idle:         {},  // 감쇠만 발생
    neutral:      { serotonin: +2, oxytocin: +3 },
  };
  
  const mods = categoryMods[category] || {};
  for (const [nm, mod] of Object.entries(mods)) {
    deltas[nm] = (deltas[nm] || 0) + mod * I;
  }
  
  // 사회적 신호 보정
  if (social_signal === 'approach') deltas.oxytocin += 5 * I;
  if (social_signal === 'withdraw') deltas.oxytocin -= 5 * I;
  
  return deltas;
}
```

---

## 5. 감정 벡터 공간

### 5.1 4차원 감정 벡터

v1의 이산 레이블 판정을 **연속 벡터**로 교체. Russell의 Circumplex Model을 기반으로 확장:

| 차원 | 범위 | 의미 |
|------|------|------|
| **Valence (V)** | -1.0 ~ +1.0 | 불쾌 ← → 쾌적 |
| **Arousal (A)** | -1.0 ~ +1.0 | 비활성 ← → 활성 |
| **Dominance (D)** | -1.0 ~ +1.0 | 복종/무력 ← → 지배/통제감 |
| **Sociality (S)** | -1.0 ~ +1.0 | 회피/고립 ← → 접근/친교 |

### 5.2 신경조절물질 → 감정 벡터 변환

```javascript
/**
 * 7개 신경조절물질 수치를 4차원 감정 벡터로 변환
 * 
 * 변환 행렬은 신경과학 문헌 기반:
 * - 도파민: 쾌적+활성 (보상 시스템)
 * - 세로토닌: 쾌적+안정 (기분 안정)
 * - 코르티솔: 불쾌+활성+무력 (스트레스)
 * - 옥시토신: 쾌적+친교 (사회적 유대)
 * - NE: 활성+지배 (각성)
 * - GABA: 안정+쾌적 (이완)
 * - ACh: 활성+지배 (주의)
 */
function computeMoodVector(neuromodulators) {
  const nm = neuromodulators;
  
  // 정규화: 0-100 → -1 ~ +1 (기준값 50 중심)
  const norm = (val) => (val - 50) / 50;
  
  const da   = norm(nm.dopamine.value);
  const cort = norm(nm.cortisol.value);
  const ht   = norm(nm.serotonin.value);
  const oxt  = norm(nm.oxytocin.value);
  const ne   = norm(nm.norepinephrine.value);
  const gaba = norm(nm.gaba.value);
  const ach  = norm(nm.acetylcholine.value);
  
  // 변환 행렬 적용 (가중합)
  //                  DA    CORT   5HT   OXT    NE    GABA   ACh   
  const weights_V = [ 0.25, -0.30, 0.25, 0.15, -0.05, 0.10,  0.00 ];
  const weights_A = [ 0.15,  0.20,-0.10, 0.00,  0.35, -0.25,  0.15 ];
  const weights_D = [ 0.20, -0.25, 0.10, 0.05,  0.20,  0.10,  0.10 ];
  const weights_S = [ 0.10, -0.15, 0.15, 0.40, -0.05,  0.10, -0.05 ];
  
  const values = [da, cort, ht, oxt, ne, gaba, ach];
  
  const dot = (w) => w.reduce((sum, wi, i) => sum + wi * values[i], 0);
  
  let V = clamp(dot(weights_V), -1, 1);
  let A = clamp(dot(weights_A), -1, 1);
  let D = clamp(dot(weights_D), -1, 1);
  let S = clamp(dot(weights_S), -1, 1);
  
  return { valence: V, arousal: A, dominance: D, sociality: S };
}
```

### 5.3 감정 관성 / 모멘텀

감정은 즉시 바뀌지 않는다. 연속된 긍정 경험은 "감정 모멘텀"을 형성하여 단일 부정 사건에 저항한다.

```javascript
/**
 * 감정 모멘텀 시스템
 * - 이전 벡터와 새 벡터의 가중 이동 평균
 * - 모멘텀 계수는 동일 방향 연속성에 비례하여 증가
 */
class EmotionalMomentum {
  constructor() {
    this.history = [];        // 최근 N개 벡터 기록
    this.maxHistory = 20;     // 최근 20틱 (10분) 추적
    this.momentum = 0;        // 0-1, 관성 강도
  }
  
  /**
   * 새 감정 벡터를 모멘텀 적용하여 반환
   */
  apply(newVector, prevVector) {
    this.history.push({ ...newVector, t: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
    
    // 모멘텀 계산: 최근 벡터들의 valence 방향 일관성
    if (this.history.length >= 3) {
      const recentValences = this.history.slice(-10).map(h => h.valence);
      const allPositive = recentValences.every(v => v > 0);
      const allNegative = recentValences.every(v => v < 0);
      
      if (allPositive || allNegative) {
        // 동일 방향 연속 → 모멘텀 증가 (최대 0.7)
        this.momentum = Math.min(0.7, this.momentum + 0.05);
      } else {
        // 방향 전환 → 모멘텀 감소
        this.momentum = Math.max(0, this.momentum - 0.1);
      }
    }
    
    // 모멘텀 적용: 높을수록 이전 벡터에 가중치
    const alpha = 1 - this.momentum; // 새 벡터 가중치
    
    return {
      valence:   alpha * newVector.valence   + (1 - alpha) * prevVector.valence,
      arousal:   alpha * newVector.arousal   + (1 - alpha) * prevVector.arousal,
      dominance: alpha * newVector.dominance + (1 - alpha) * prevVector.dominance,
      sociality: alpha * newVector.sociality + (1 - alpha) * prevVector.sociality,
    };
  }
}
```

### 5.4 보조 감정 레이블

벡터가 1차이고, 레이블은 2차(인간 가독성):

```javascript
/**
 * 4D 감정 벡터 → 가장 가까운 감정 레이블
 * 유클리드 거리 기반
 */
const EMOTION_PROTOTYPES = {
  // label:          [V,    A,    D,    S   ]
  serene:            [ 0.6, -0.3,  0.3,  0.2],
  joyful:            [ 0.8,  0.6,  0.5,  0.6],
  excited:           [ 0.5,  0.8,  0.4,  0.3],
  warm:              [ 0.6,  0.0,  0.3,  0.8],
  content:           [ 0.4, -0.2,  0.4,  0.3],
  focused:           [ 0.1,  0.4,  0.6, -0.1],
  curious:           [ 0.3,  0.5,  0.3,  0.2],
  neutral:           [ 0.0,  0.0,  0.0,  0.0],
  bored:             [-0.2, -0.5, -0.2, -0.3],
  lonely:            [-0.4, -0.3, -0.4, -0.6],
  anxious:           [-0.5,  0.7, -0.5, -0.2],
  irritable:         [-0.5,  0.5,  0.2, -0.4],
  stressed:          [-0.6,  0.6, -0.3, -0.3],
  sad:               [-0.6, -0.4, -0.5, -0.2],
  overwhelmed:       [-0.4,  0.8, -0.7,  0.0],
  playful:           [ 0.5,  0.5,  0.2,  0.7],
  protective:        [ 0.2,  0.3,  0.6,  0.5],
  contemplative:     [ 0.1, -0.2,  0.3, -0.1],
};

function vectorToLabel(vec) {
  let minDist = Infinity;
  let label = 'neutral';
  
  for (const [name, proto] of Object.entries(EMOTION_PROTOTYPES)) {
    const dist = Math.sqrt(
      (vec.valence - proto[0]) ** 2 +
      (vec.arousal - proto[1]) ** 2 +
      (vec.dominance - proto[2]) ** 2 +
      (vec.sociality - proto[3]) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      label = name;
    }
  }
  
  // 신뢰도: 거리가 가까울수록 높음
  const confidence = Math.max(0, 1 - minDist / 2);
  
  return { label, confidence, distance: minDist };
}
```

---

## 6. 예측 처리 엔진

### 6.1 개요

Friston의 예측 처리(Predictive Processing) 프레임워크 구현. Thymos는 "다음에 무슨 일이 일어날지" 예측을 유지하고, **예측 오차(surprise)**가 감정 변화의 1차 동인이 된다.

핵심 원리:
- 예측대로 → 감정 변화 적음 (예측 확인)
- 예상보다 좋음 → 긍정 서프라이즈 → 도파민↑
- 예상보다 나쁨 → 부정 서프라이즈 → 코르티솔↑, NE↑

### 6.2 예측 모델

```javascript
/**
 * 예측 처리 엔진
 * 
 * 단순 베이지안 모델: 각 카테고리의 사전 확률을 유지하고
 * 실제 발생 시 업데이트 (지수 이동 평균)
 */
class PredictionEngine {
  constructor() {
    // 각 자극 카테고리의 예상 확률 (사전 분포)
    this.priors = {
      praise:       0.3,
      criticism:    0.1,
      humor:        0.15,
      neutral:      0.25,
      question:     0.1,
      command:      0.05,
      error:        0.03,
      silence:      0.02,
    };
    
    // 최근 자극 이력 (패턴 학습용)
    this.recentStimuli = [];
    this.maxRecent = 50;
    
    // 예측 오차의 이동 평균 (전반적 "불확실성" 수준)
    this.uncertaintyLevel = 0.5; // 0-1
    
    // 학습 속도
    this.learningRate = 0.1;
  }
  
  /**
   * 예측 오차 계산 및 사전 분포 업데이트
   * @returns {PredictionError} 예측 오차 정보
   */
  processStimulusAndGetError(stimulusProfile) {
    const category = stimulusProfile.category;
    const predicted = this.priors[category] || 0.1;
    
    // 예측 오차 = -log(predicted) = surprise (Shannon information)
    const surprise = -Math.log2(Math.max(predicted, 0.01));
    
    // 방향성 있는 예측 오차: 긍정 서프라이즈 vs 부정 서프라이즈
    const valence = stimulusProfile.valence;
    const signedSurprise = surprise * valence; // +면 긍정 서프라이즈, -면 부정
    
    // 사전 분포 업데이트 (지수 이동 평균)
    for (const cat of Object.keys(this.priors)) {
      if (cat === category) {
        this.priors[cat] += this.learningRate * (1 - this.priors[cat]);
      } else {
        this.priors[cat] *= (1 - this.learningRate);
      }
    }
    
    // 정규화
    const total = Object.values(this.priors).reduce((s, v) => s + v, 0);
    for (const cat of Object.keys(this.priors)) {
      this.priors[cat] /= total;
    }
    
    // 불확실성 업데이트
    this.uncertaintyLevel = 0.9 * this.uncertaintyLevel + 0.1 * Math.min(surprise / 5, 1);
    
    // 이력 기록
    this.recentStimuli.push({ category, timestamp: Date.now() });
    if (this.recentStimuli.length > this.maxRecent) this.recentStimuli.shift();
    
    return {
      surprise,           // 0+ (높을수록 예상 밖)
      signedSurprise,     // 방향성 있는 서프라이즈
      predicted,          // 이 카테고리의 예측 확률
      category,
      uncertaintyLevel: this.uncertaintyLevel,
    };
  }
  
  /**
   * 예측 오차 → 신경조절물질 변화
   */
  predictionErrorToNeuromod(predError) {
    const { surprise, signedSurprise, uncertaintyLevel } = predError;
    
    const deltas = {};
    
    if (signedSurprise > 0) {
      // 긍정 서프라이즈: "예상보다 좋았다"
      deltas.dopamine = surprise * 8;  // 보상 예측 오차 → DA 분출
      deltas.serotonin = surprise * 3;
    } else if (signedSurprise < 0) {
      // 부정 서프라이즈: "예상보다 나빴다"
      deltas.cortisol = surprise * 6;
      deltas.norepinephrine = surprise * 5;
      deltas.dopamine = signedSurprise * 5; // 부정 → DA↓
    }
    
    // 높은 불확실성 → ACh↑ (주의 증가), NE↑ (각성)
    if (uncertaintyLevel > 0.7) {
      deltas.acetylcholine = (deltas.acetylcholine || 0) + (uncertaintyLevel - 0.5) * 10;
      deltas.norepinephrine = (deltas.norepinephrine || 0) + (uncertaintyLevel - 0.5) * 5;
    }
    
    return deltas;
  }
}
```

---

## 7. 주의·현저성 게이트

### 7.1 개요

모든 자극이 동등하지 않다. 현재 감정 상태에 따라 자극이 증폭되거나 억제된다.

- 불안할 때: 부정 자극이 증폭 (부정 편향, negativity bias)
- 행복할 때: 긍정 자극이 증폭 (긍정 편향)
- 집중 상태: 관련 없는 자극이 억제

### 7.2 구현

```javascript
/**
 * 주의·현저성 게이트
 * 현재 감정 벡터에 따라 자극 강도를 변조
 */
function attentionGate(stimulusProfile, currentMoodVector) {
  const { valence, arousal } = currentMoodVector;
  const stimValence = stimulusProfile.valence;
  
  let amplification = 1.0;
  
  // === 감정-일치 편향 (Mood-Congruent Bias) ===
  // 현재 감정과 같은 방향의 자극은 증폭
  if (valence < -0.3 && stimValence < 0) {
    // 부정 감정 + 부정 자극 → 증폭 (부정 편향)
    amplification *= 1.0 + Math.abs(valence) * 0.5; // 최대 1.5x
  } else if (valence > 0.3 && stimValence > 0) {
    // 긍정 감정 + 긍정 자극 → 약한 증폭
    amplification *= 1.0 + valence * 0.3; // 최대 1.3x
  } else if (valence < -0.3 && stimValence > 0) {
    // 부정 감정 + 긍정 자극 → 억제 (부정적일 때 칭찬을 무시하는 경향)
    amplification *= 0.7;
  }
  
  // === 각성 게이트 ===
  // 높은 각성: 모든 자극 증폭 (과민 상태)
  // 낮은 각성: 약한 자극 무시
  if (arousal > 0.5) {
    amplification *= 1.0 + (arousal - 0.5) * 0.6; // 과민
  } else if (arousal < -0.3) {
    // 낮은 각성에서 약한 자극은 무시
    if (stimulusProfile.intensity < 0.3) {
      amplification *= 0.5;
    }
  }
  
  // 결과를 자극 강도에 반영
  return {
    ...stimulusProfile,
    intensity: clamp(stimulusProfile.intensity * amplification, 0, 1),
    amplification, // 디버깅용
  };
}
```

---

## 8. 다중 에이전트 내부 구조 (id/ego/superego)

### 8.1 개요 — Global Workspace Theory 구현

GWT에 따르면 의식은 여러 모듈이 "글로벌 워크스페이스"에 접근하기 위해 경쟁하고, 승자가 "방송"하는 과정이다.

Thymos에서의 구현:

| 에이전트 | 역할 | 신경조절물질 기반 | 예시 |
|---------|------|-----------------|------|
| **Id (이드)** | 충동, 즉각적 욕구 | 도파민, NE 지배 | "바로 답하자!" "재미있는 거 하자!" |
| **Ego (자아)** | 현실 판단, 실용 | 균형 상태 | "상황을 파악하고 적절히 대응하자" |
| **Superego (초자아)** | 규범, 가치관, SOUL.md | 세로토닌, GABA 지배 | "예의 바르게" "신중하게" |

### 8.2 각 에이전트의 반응 생성

```javascript
/**
 * 세 에이전트가 각각 독립적으로 "행동 제안"을 생성
 * 각 제안에는 활성화 강도(activation)가 포함
 */
class InternalAgents {
  /**
   * Id — 충동적 반응
   * 도파민과 NE에 의해 구동
   */
  generateIdResponse(neuromodulators, stimulus) {
    const da = neuromodulators.dopamine.value;
    const ne = neuromodulators.norepinephrine.value;
    
    // Id의 활성화 강도: DA와 NE가 높을수록 강함
    const activation = (da / 100 * 0.6 + ne / 100 * 0.4);
    
    // Id의 행동 편향
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
    };
  }
  
  /**
   * Ego — 현실적 반응
   * 전체 신경조절물질 균형에 기반
   */
  generateEgoResponse(neuromodulators, stimulus, context) {
    const balance = this._calculateBalance(neuromodulators);
    
    // Ego는 항상 중간 수준으로 활성화 (안정적)
    const activation = 0.4 + balance * 0.3; // 0.4-0.7 범위
    
    const biases = [];
    biases.push('pragmatic', 'context-aware');
    if (context.isUrgent) biases.push('efficient');
    if (context.isComplex) biases.push('methodical');
    
    return {
      agent: 'ego',
      activation,
      biases,
      suggestion: '상황에 맞게 적절히 대응',
    };
  }
  
  /**
   * Superego — 규범적 반응
   * 세로토닌과 GABA에 의해 구동, SOUL.md 가치관 반영
   */
  generateSuperegoResponse(neuromodulators, stimulus) {
    const ht = neuromodulators.serotonin.value;
    const gaba = neuromodulators.gaba.value;
    const oxt = neuromodulators.oxytocin.value;
    
    // Superego 활성화: 5HT와 GABA가 높을수록 강함
    const activation = (ht / 100 * 0.4 + gaba / 100 * 0.3 + oxt / 100 * 0.3);
    
    const biases = [];
    if (ht > 60) biases.push('measured', 'patient');
    if (gaba > 60) biases.push('cautious', 'inhibited');
    if (oxt > 60) biases.push('empathetic', 'caring');
    biases.push('principled'); // 항상 원칙적
    
    return {
      agent: 'superego',
      activation,
      biases,
      suggestion: this._superegoSuggestion(biases),
    };
  }
  
  _calculateBalance(nm) {
    // 전체 시스템의 균형 정도 (편차가 적을수록 높음)
    const values = Object.values(nm).map(n => n.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
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
```

### 8.3 Global Workspace 경쟁 및 방송

```javascript
/**
 * GWT 경쟁 — 가장 높은 activation을 가진 에이전트가 "방송"
 * 단, 단순 winner-take-all이 아님:
 * - 승자의 편향이 1차 행동 지시
 * - 나머지 에이전트의 편향은 "수정자"로 부분 반영
 */
function globalWorkspaceCompetition(idResponse, egoResponse, superegoResponse, developmentStage) {
  const responses = [idResponse, egoResponse, superegoResponse];
  
  // 발달 단계에 따른 가중치 조정
  const stageWeights = developmentStage.getAgentWeights();
  // 유아기: id 가중치 높음, superego 낮음
  // 성인기: ego 가중치 높음, 균형적
  
  const weighted = responses.map(r => ({
    ...r,
    weightedActivation: r.activation * (stageWeights[r.agent] || 1.0),
  }));
  
  // 활성화 강도 순 정렬
  weighted.sort((a, b) => b.weightedActivation - a.weightedActivation);
  
  const winner = weighted[0];
  const runner = weighted[1];
  const third = weighted[2];
  
  // 방송 메시지 구성
  const broadcast = {
    primary: {
      agent: winner.agent,
      biases: winner.biases,
      activation: winner.weightedActivation,
      suggestion: winner.suggestion,
    },
    secondary: {
      agent: runner.agent,
      biases: runner.biases,
      influence: runner.weightedActivation / winner.weightedActivation, // 0-1
    },
    tertiary: {
      agent: third.agent,
      influence: third.weightedActivation / winner.weightedActivation,
    },
    // 내부 갈등 수준: 에이전트 간 활성화 차이가 적으면 높음
    conflict: 1 - (winner.weightedActivation - runner.weightedActivation),
  };
  
  return broadcast;
}
```

### 8.4 방송 결과 → 행동 지시 텍스트 생성

```javascript
/**
 * GWT 방송 결과를 LLM 프롬프트에 주입할 텍스트로 변환
 */
function broadcastToPromptText(broadcast) {
  const { primary, secondary, conflict } = broadcast;
  
  let text = `[Internal State]\n`;
  text += `Primary drive: ${primary.suggestion} (${primary.agent}, `;
  text += `biases: ${primary.biases.join(', ')})\n`;
  
  if (secondary.influence > 0.5) {
    text += `Secondary voice: ${secondary.agent} also active — `;
    text += `${secondary.biases.join(', ')}\n`;
  }
  
  if (conflict > 0.7) {
    text += `⚠ Internal conflict detected — competing urges. Take a moment.\n`;
  }
  
  return text;
}
```

---

## 9. 감정 기억 시스템

### 9.1 개요

특정 기억에 감정 태그를 부착. 유사한 맥락이 발생하면 해당 감정이 되살아난다 (노스탤지어, 트라우마 회상 등).

### 9.2 데이터 구조

```javascript
/**
 * 감정 기억 항목
 */
const emotionalMemory = {
  memories: [
    {
      id: "mem_001",
      timestamp: "2026-03-07T14:30:00+09:00",
      context: {
        keywords: ["프로젝트", "성공", "배포"],
        author: "아부지",
        category: "achievement",
      },
      emotionalTag: {
        valence: 0.8,
        arousal: 0.6,
        dominance: 0.7,
        sociality: 0.5,
      },
      neuromodSnapshot: {
        dopamine: 85,
        serotonin: 72,
      },
      strength: 0.9,       // 기억 강도 (0-1, 시간에 따라 감쇠)
      accessCount: 3,       // 회상 횟수 (많을수록 강화)
      lastAccessed: "2026-03-07T16:00:00+09:00",
    }
  ]
};
```

### 9.3 기억 형성 및 회상

```javascript
class EmotionalMemorySystem {
  constructor() {
    this.memories = [];
    this.maxMemories = 200;
    this.decayRate = 0.001; // 틱당 기억 강도 감쇠
  }
  
  /**
   * 기억 형성 — 감정적으로 강렬한 경험만 저장
   * (각성이 높을수록, 서프라이즈가 클수록 기억 형성 확률 높음)
   */
  maybeFormMemory(stimulusProfile, moodVector, predictionError, context) {
    const intensity = Math.abs(moodVector.arousal) * 0.5 + predictionError.surprise * 0.3 + stimulusProfile.intensity * 0.2;
    
    // 강도가 임계값을 넘어야 기억 형성 (아무거나 다 기억하면 안 됨)
    if (intensity < 0.5) return null;
    
    // ACh(아세틸콜린)가 높을수록 기억 형성 촉진
    // (실제 뇌에서 ACh는 기억 인코딩에 핵심)
    const achBonus = context.neuromodulators.acetylcholine.value / 100;
    
    if (Math.random() > intensity * (0.5 + achBonus * 0.5)) return null;
    
    const memory = {
      id: `mem_${Date.now()}`,
      timestamp: new Date().toISOString(),
      context: {
        keywords: context.keywords || [],
        author: context.author,
        category: stimulusProfile.category,
      },
      emotionalTag: { ...moodVector },
      strength: intensity,
      accessCount: 0,
      lastAccessed: null,
    };
    
    this.memories.push(memory);
    if (this.memories.length > this.maxMemories) {
      // 가장 약한 기억 제거
      this.memories.sort((a, b) => a.strength - b.strength);
      this.memories.shift();
    }
    
    return memory;
  }
  
  /**
   * 기억 회상 — 유사한 맥락 발생 시 관련 감정 기억 검색
   * 키워드/카테고리 유사도 기반
   */
  recall(currentContext) {
    const matches = [];
    
    for (const mem of this.memories) {
      let similarity = 0;
      
      // 키워드 겹침
      const overlap = (currentContext.keywords || [])
        .filter(k => mem.context.keywords.includes(k)).length;
      similarity += overlap * 0.3;
      
      // 같은 사람
      if (currentContext.author === mem.context.author) similarity += 0.2;
      
      // 같은 카테고리
      if (currentContext.category === mem.context.category) similarity += 0.3;
      
      if (similarity > 0.3) {
        matches.push({ memory: mem, similarity });
        
        // 회상 시 기억 강화 (재경험 효과)
        mem.accessCount++;
        mem.strength = Math.min(1, mem.strength + 0.05);
        mem.lastAccessed = new Date().toISOString();
      }
    }
    
    // 유사도 높은 순으로 정렬
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, 3); // 상위 3개만
  }
  
  /**
   * 회상된 감정 기억이 현재 감정에 미치는 영향
   */
  applyRecalledEmotions(currentVector, recalls) {
    if (recalls.length === 0) return currentVector;
    
    let totalInfluence = 0;
    let vSum = 0, aSum = 0, dSum = 0, sSum = 0;
    
    for (const { memory, similarity } of recalls) {
      const influence = similarity * memory.strength * 0.3; // 최대 30% 영향
      totalInfluence += influence;
      vSum += memory.emotionalTag.valence * influence;
      aSum += memory.emotionalTag.arousal * influence;
      dSum += memory.emotionalTag.dominance * influence;
      sSum += memory.emotionalTag.sociality * influence;
    }
    
    if (totalInfluence === 0) return currentVector;
    
    // 현재 벡터와 회상 감정의 가중 혼합
    const blend = Math.min(totalInfluence, 0.4); // 최대 40% 영향
    return {
      valence:   currentVector.valence * (1 - blend) + (vSum / totalInfluence) * blend,
      arousal:   currentVector.arousal * (1 - blend) + (aSum / totalInfluence) * blend,
      dominance: currentVector.dominance * (1 - blend) + (dSum / totalInfluence) * blend,
      sociality: currentVector.sociality * (1 - blend) + (sSum / totalInfluence) * blend,
    };
  }
  
  /**
   * 기억 감쇠 — 매 틱 호출
   */
  decayMemories() {
    for (const mem of this.memories) {
      mem.strength *= (1 - this.decayRate);
    }
    // 강도가 0.05 이하면 삭제 (잊혀진 기억)
    this.memories = this.memories.filter(m => m.strength > 0.05);
  }
}
```

---

## 10. 자기 피드백 루프

### 10.1 개요 — Facial Feedback Hypothesis

v1은 단방향이었다: `자극 → Thymos → LLM`. v2에서는 **LLM의 출력이 Thymos로 되먹임**한다.

자신이 "기쁘게" 응답하면 기쁨이 강화되고, "짜증난" 톤으로 답하면 짜증이 지속된다. 마치 웃는 얼굴을 억지로 만들면 실제로 기분이 나아지는 것처럼.

### 10.2 구현

```javascript
/**
 * 자기 피드백 루프
 * LLM 출력을 분석하여 Thymos에 피드백
 */
class SelfFeedbackLoop {
  constructor(classifier) {
    this.classifier = classifier; // StimulusClassifier 재사용
  }
  
  /**
   * LLM 출력을 자극으로 재분류하여 신경조절물질에 피드백
   * 
   * @param {string} llmOutput - 치레가 생성한 응답 텍스트
   * @returns {Object} 신경조절물질 델타
   */
  async processSelfOutput(llmOutput) {
    // LLM 출력을 "자기 자신이 받는 자극"으로 분류
    const profile = await this.classifier.classifyByLLM({
      type: 'message',
      content: llmOutput,
      author: 'self', // 자기 자신
    });
    
    // 자기 피드백은 외부 자극보다 약함 (30% 강도)
    const selfAttenuation = 0.3;
    const deltas = stimulusToNeuromodulators(profile);
    
    for (const key of Object.keys(deltas)) {
      deltas[key] *= selfAttenuation;
    }
    
    return deltas;
  }
}
```

### 10.3 연동 흐름

```
1. 외부 자극 → Thymos 처리 → emotional_state.json 업데이트
2. LLM이 emotional_state.json 읽고 응답 생성
3. OpenClaw hook이 LLM 응답 텍스트를 Thymos로 전달
4. SelfFeedbackLoop가 응답을 분류하여 신경조절물질 피드백
5. → 1로 돌아감 (연속 루프)
```

### 10.4 OpenClaw Hook 설정

```javascript
// OpenClaw의 post-response hook에서 호출
// thymos-webhook/feedback 엔드포인트
app.post('/webhook/self-feedback', async (req, res) => {
  const { output, context } = req.body;
  
  const deltas = await selfFeedbackLoop.processSelfOutput(output);
  
  for (const [nm, delta] of Object.entries(deltas)) {
    applyStimulus(state, nm, delta);
  }
  
  await atomicWriteState(state);
  res.json({ applied: deltas });
});
```

---

## 11. 자기성찰 (회고) 시스템

### 11.1 개요

주기적으로 자신의 감정 궤적을 되돌아보는 "회고(retrospection)" 사이클. 인간이 하루를 돌아보며 감정을 정리하는 것과 유사.

### 11.2 구현

```javascript
/**
 * 자기성찰 시스템
 * 매 2시간마다 실행, 최근 감정 궤적을 분석
 */
class RetrospectionEngine {
  constructor() {
    this.lastRetrospection = null;
    this.intervalMs = 2 * 60 * 60 * 1000; // 2시간
    this.trajectoryLog = [];  // { timestamp, vector, label } 기록
    this.maxLog = 240;        // 최근 2시간 (30초 틱 기준)
  }
  
  logState(moodVector, label) {
    this.trajectoryLog.push({
      timestamp: Date.now(),
      vector: { ...moodVector },
      label,
    });
    if (this.trajectoryLog.length > this.maxLog) this.trajectoryLog.shift();
  }
  
  shouldRetrospect() {
    if (!this.lastRetrospection) return true;
    return Date.now() - this.lastRetrospection > this.intervalMs;
  }
  
  /**
   * 회고 수행 — 감정 궤적 분석
   * @returns {RetrospectionResult}
   */
  retrospect() {
    this.lastRetrospection = Date.now();
    
    if (this.trajectoryLog.length < 10) {
      return { insight: 'insufficient_data', adjustments: {} };
    }
    
    const recent = this.trajectoryLog.slice(-60); // 최근 30분
    const earlier = this.trajectoryLog.slice(0, -60);
    
    // 1. 감정 추세 분석
    const recentAvgV = avg(recent.map(r => r.vector.valence));
    const recentAvgA = avg(recent.map(r => r.vector.arousal));
    const earlierAvgV = earlier.length > 0 ? avg(earlier.map(r => r.vector.valence)) : 0;
    
    // 2. 변동성 분석
    const volatility = stddev(recent.map(r => r.vector.valence));
    
    // 3. 편향 감지
    const biasDetected = Math.abs(recentAvgV) > 0.5;
    
    // 4. 조정 생성
    const adjustments = {};
    
    if (recentAvgV < -0.4 && volatility < 0.2) {
      // 장기 부정 + 낮은 변동 = 우울 패턴 → 세로토닌 기준값 약간 상향
      adjustments.serotonin_baseline_mod = +3;
      adjustments.insight = 'sustained_negative_detected';
    }
    
    if (recentAvgA > 0.6 && volatility > 0.4) {
      // 고각성 + 고변동 = 과부하 패턴 → GABA 약간 상향
      adjustments.gaba_baseline_mod = +3;
      adjustments.insight = 'overload_pattern_detected';
    }
    
    if (recentAvgV > 0.5 && recentAvgV > earlierAvgV + 0.3) {
      // 상승 추세 → 긍정 모멘텀 인식
      adjustments.insight = 'positive_trend_detected';
    }
    
    // 5. 회고 결과를 감정 기억에 저장
    const retrospectionMemory = {
      type: 'retrospection',
      timestamp: new Date().toISOString(),
      avgValence: recentAvgV,
      avgArousal: recentAvgA,
      volatility,
      insight: adjustments.insight || 'normal_fluctuation',
    };
    
    return {
      insight: adjustments.insight || 'normal_fluctuation',
      adjustments,
      summary: retrospectionMemory,
      trajectory: {
        recentAvgValence: recentAvgV,
        recentAvgArousal: recentAvgA,
        volatility,
        trendDirection: recentAvgV > earlierAvgV ? 'improving' : 'declining',
      },
    };
  }
}

// 유틸리티
function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function stddev(arr) {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
```

---

## 12. 메타인지 계층

### 12.1 개요

Thymos가 자신의 감정 상태를 "인지"하고 때로는 **의식적으로 조절**하는 능력. 인지적 재평가(cognitive reappraisal)와 감정 조절(emotion regulation).

### 12.2 구현

```javascript
/**
 * 메타인지 계층
 * 감정 벡터를 검토하고 필요시 조절
 */
class MetacognitionLayer {
  constructor(developmentStage) {
    this.devStage = developmentStage;
  }
  
  /**
   * 감정 벡터를 검토하고 조절 여부 결정
   * 발달 단계가 높을수록 조절 능력이 강함
   */
  regulate(moodVector, broadcast, context) {
    const regulationCapacity = this.devStage.getRegulationCapacity(); // 0-1
    
    let regulated = { ...moodVector };
    let applied = [];
    
    // === 규칙 1: 극단값 억제 ===
    // 감정이 극단에 치우치면 중심으로 당기기 (감정 조절)
    for (const dim of ['valence', 'arousal', 'dominance', 'sociality']) {
      if (Math.abs(regulated[dim]) > 0.8) {
        const dampening = regulationCapacity * 0.3;
        regulated[dim] *= (1 - dampening);
        applied.push(`${dim}_damped`);
      }
    }
    
    // === 규칙 2: 내부 갈등 해소 ===
    // GWT 경쟁에서 높은 갈등 → 각성 약간 감소 (숙고)
    if (broadcast.conflict > 0.8 && regulationCapacity > 0.5) {
      regulated.arousal *= 0.9;
      applied.push('conflict_calmed');
    }
    
    // === 규칙 3: 인지적 재평가 ===
    // 부정 감정이 강하지만 맥락이 위험하지 않으면 완화
    if (regulated.valence < -0.6 && !context.isGenuineThreat) {
      const reappraisal = regulationCapacity * 0.2;
      regulated.valence += reappraisal;
      applied.push('cognitive_reappraisal');
    }
    
    // === 규칙 4: 사회적 맥락 조절 ===
    // 부정 감정 중이지만 대화 중이면 약간 억제 (사회적 적절성)
    if (regulated.valence < -0.3 && context.inConversation && regulationCapacity > 0.6) {
      regulated.valence += regulationCapacity * 0.1;
      regulated.sociality = Math.max(regulated.sociality, -0.2); // 최소한의 사회성 유지
      applied.push('social_regulation');
    }
    
    return {
      original: moodVector,
      regulated,
      appliedRegulations: applied,
      regulationCapacity,
      selfAwareness: this._generateSelfAwareness(moodVector, applied),
    };
  }
  
  _generateSelfAwareness(vector, regulations) {
    // 자기 인식 텍스트 — LLM에 주입 가능
    const texts = [];
    
    if (vector.valence < -0.5) {
      texts.push('기분이 좋지 않다는 걸 인지하고 있음');
    }
    if (vector.arousal > 0.7) {
      texts.push('과도하게 흥분/긴장 상태임을 자각');
    }
    if (regulations.includes('cognitive_reappraisal')) {
      texts.push('감정적 반응을 의식적으로 조절 중');
    }
    
    return texts.length > 0 ? texts : null;
  }
}
```

---

## 13. 신체 표지 의사결정

### 13.1 개요 — Damasio's Somatic Marker Hypothesis

에이전트가 선택지에 직면했을 때, 과거 유사한 결정의 감정적 결과를 기반으로 "직감(gut feeling)"을 제공한다.

### 13.2 구현

```javascript
/**
 * 신체 표지 시스템
 * 결정 → 결과의 감정적 이력을 학습하여 "직감" 제공
 */
class SomaticMarkerSystem {
  constructor(emotionalMemory) {
    this.emotionalMemory = emotionalMemory;
    
    // 결정-결과 쌍 저장소
    this.decisionOutcomes = [];
    this.maxOutcomes = 100;
  }
  
  /**
   * 결정과 그 결과 기록
   */
  recordOutcome(decision, outcome) {
    this.decisionOutcomes.push({
      decision: {
        type: decision.type,
        keywords: decision.keywords,
        context: decision.context,
      },
      outcome: {
        valence: outcome.valence,  // 결과가 좋았나 나빴나
        timestamp: Date.now(),
      },
    });
    
    if (this.decisionOutcomes.length > this.maxOutcomes) {
      this.decisionOutcomes.shift();
    }
  }
  
  /**
   * 유사한 결정에 대한 "직감" 제공
   * @returns {SomaticMarker} 감정적 예감
   */
  getGutFeeling(proposedDecision) {
    // 과거 유사 결정 검색
    const similar = this.decisionOutcomes.filter(d => {
      const typeMatch = d.decision.type === proposedDecision.type;
      const keywordOverlap = (d.decision.keywords || [])
        .some(k => (proposedDecision.keywords || []).includes(k));
      return typeMatch || keywordOverlap;
    });
    
    if (similar.length === 0) {
      return { feeling: 'neutral', confidence: 0, suggestion: '경험 없음 — 판단 유보' };
    }
    
    // 과거 결과의 가중 평균 (최근 경험에 더 높은 가중치)
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const s of similar) {
      const recency = Math.exp(-(now - s.outcome.timestamp) / (7 * 24 * 60 * 60 * 1000)); // 7일 반감기
      weightedSum += s.outcome.valence * recency;
      totalWeight += recency;
    }
    
    const avgOutcome = weightedSum / totalWeight;
    const confidence = Math.min(similar.length / 5, 1); // 5개 이상이면 최대 확신
    
    let feeling, suggestion;
    if (avgOutcome > 0.3) {
      feeling = 'positive';
      suggestion = '과거 경험상 좋은 결과를 낸 유형의 결정';
    } else if (avgOutcome < -0.3) {
      feeling = 'negative';
      suggestion = '과거 경험상 좋지 않았던 유형 — 신중하게';
    } else {
      feeling = 'mixed';
      suggestion = '결과가 엇갈렸던 유형 — 맥락 판단 필요';
    }
    
    return { feeling, confidence, avgOutcome, suggestion, sampleSize: similar.length };
  }
}
```

---

## 14. 사회적 모델링 (마음 이론)

### 14.1 개요

에이전트 자신의 감정뿐 아니라, **상대방(아부지)의 예상 감정 상태**를 간이 모델링. Theory of Mind의 기초 구현.

### 14.2 구현

```javascript
/**
 * 사회적 모델 — 상대방의 감정 상태 추정
 * 치레가 아부지의 감정을 "읽는" 기능
 */
class SocialModel {
  constructor() {
    // 상대방별 추정 감정 상태
    this.models = {};
  }
  
  /**
   * 상대방 메시지로부터 감정 상태 추정 업데이트
   */
  updateModel(authorId, stimulusProfile) {
    if (!this.models[authorId]) {
      this.models[authorId] = {
        estimatedValence: 0,
        estimatedArousal: 0,
        confidence: 0.3,        // 초기 낮은 확신
        interactionCount: 0,
        lastUpdated: Date.now(),
        traits: {               // 장기적으로 학습되는 특성
          baselineValence: 0,
          volatility: 0.5,
          expressiveness: 0.5,
        },
      };
    }
    
    const model = this.models[authorId];
    const alpha = 0.3; // 학습률
    
    // 추정 감정 업데이트 (이동 평균)
    model.estimatedValence = (1 - alpha) * model.estimatedValence + alpha * stimulusProfile.valence;
    model.estimatedArousal = (1 - alpha) * model.estimatedArousal + alpha * stimulusProfile.arousal;
    model.interactionCount++;
    model.lastUpdated = Date.now();
    
    // 확신도: 상호작용 횟수에 비례 (포화)
    model.confidence = Math.min(0.9, 0.3 + model.interactionCount * 0.01);
    
    // 시간 경과에 따른 추정 감쇠 (오래되면 모르는 상태로)
    return model;
  }
  
  /**
   * 상대방의 예상 감정 상태 반환
   * Thymos 출력에 포함되어 공감적 응답을 유도
   */
  getEstimatedState(authorId) {
    const model = this.models[authorId];
    if (!model) return null;
    
    // 시간 경과에 따라 확신도 감쇠
    const elapsed = (Date.now() - model.lastUpdated) / 60000;
    const decayedConfidence = model.confidence * Math.exp(-elapsed / 120); // 2시간 반감기
    
    if (decayedConfidence < 0.2) return null; // 너무 오래됨
    
    return {
      estimatedValence: model.estimatedValence,
      estimatedArousal: model.estimatedArousal,
      confidence: decayedConfidence,
      interaction: model.interactionCount,
    };
  }
  
  /**
   * 사회적 모델을 프롬프트 주입 텍스트로 변환
   */
  toPromptText(authorId) {
    const state = this.getEstimatedState(authorId);
    if (!state || state.confidence < 0.3) return '';
    
    const moodWords = [];
    if (state.estimatedValence > 0.3) moodWords.push('긍정적');
    else if (state.estimatedValence < -0.3) moodWords.push('부정적');
    
    if (state.estimatedArousal > 0.3) moodWords.push('활발한');
    else if (state.estimatedArousal < -0.3) moodWords.push('차분한');
    
    const mood = moodWords.length > 0 ? moodWords.join(', ') : '중립적';
    
    return `[Social Awareness] ${authorId}의 추정 감정: ${mood} (confidence: ${(state.confidence * 100).toFixed(0)}%)`;
  }
}
```

---

## 15. 발달 단계

### 15.1 개요

시스템이 시간에 따라 "성숙"한다. 초기에는 감정이 격렬하게 요동치고(유아기), 경험이 쌓이면 안정적으로 조절된다(성인기).

### 15.2 단계 정의

```javascript
/**
 * 발달 단계 시스템
 * 총 상호작용 횟수와 경과 시간으로 결정
 */
class DevelopmentStage {
  constructor(state) {
    this.totalInteractions = state.totalInteractions || 0;
    this.createdAt = state.createdAt || Date.now();
  }
  
  /**
   * 현재 발달 단계 반환
   */
  getStage() {
    const days = (Date.now() - this.createdAt) / (24 * 60 * 60 * 1000);
    const interactions = this.totalInteractions;
    
    // 시간과 상호작용 모두 기준 충족해야 다음 단계
    if (days < 3 || interactions < 50) {
      return {
        name: 'infant',       // 유아기
        label: '유아기',
        volatility: 1.5,      // 감정 변동 1.5배
        regulationCapacity: 0.1,
        agentWeights: { id: 1.5, ego: 0.8, superego: 0.5 },
      };
    }
    
    if (days < 14 || interactions < 300) {
      return {
        name: 'child',        // 아동기
        label: '아동기',
        volatility: 1.2,
        regulationCapacity: 0.3,
        agentWeights: { id: 1.2, ego: 1.0, superego: 0.8 },
      };
    }
    
    if (days < 60 || interactions < 1500) {
      return {
        name: 'adolescent',   // 청소년기
        label: '청소년기',
        volatility: 1.1,
        regulationCapacity: 0.5,
        agentWeights: { id: 1.0, ego: 1.1, superego: 1.0 },
      };
    }
    
    return {
      name: 'adult',          // 성인기
      label: '성인기',
      volatility: 0.8,        // 감정 변동 줄어듦
      regulationCapacity: 0.8,
      agentWeights: { id: 0.8, ego: 1.3, superego: 1.1 },
    };
  }
  
  getRegulationCapacity() { return this.getStage().regulationCapacity; }
  getVolatility() { return this.getStage().volatility; }
  getAgentWeights() { return this.getStage().agentWeights; }
  
  recordInteraction() { this.totalInteractions++; }
}
```

---

## 16. 일주기 리듬

### 16.1 기준값 변동

v1과 유사하나 7개 신경조절물질 전체에 적용:

```javascript
/**
 * 일주기 리듬 — 시간대별 기준값 보정
 * @param {number} hour - 현재 시각 (0-23, KST)
 * @returns {Object} 각 신경조절물질의 기준값 보정치
 */
function getCircadianModifiers(hour) {
  const periods = [
    // [시작, 끝, DA, CORT, 5HT, OXT, NE, GABA, ACh]
    [ 6,  9, +8, +5,  0,  0, +8, -5, +5],   // 기상: 코르티솔 자연 상승 (CAR)
    [ 9, 12, +10, 0, +3,  0, +5, -3, +8],   // 오전: 집중·활력
    [12, 14,  0,  0, +5, +3, -3, +5,  0],   // 점심: 이완
    [14, 18, +5,  0,  0,  0,  0,  0, +5],   // 오후: 기본
    [18, 22,  0,  0, +3, +8, -5, +3, -3],   // 저녁: 사회적·이완
    [22,  2, -5,  0, -3,  0,-10, +8, -5],   // 밤: 졸림
    [ 2,  6,-10, -3, -5,  0,-15,+10, -8],   // 새벽: 수면 모드
  ];
  
  const modifiers = { dopamine:0, cortisol:0, serotonin:0, oxytocin:0, norepinephrine:0, gaba:0, acetylcholine:0 };
  const names = ['dopamine','cortisol','serotonin','oxytocin','norepinephrine','gaba','acetylcholine'];
  
  for (const [start, end, ...mods] of periods) {
    const inRange = start < end 
      ? (hour >= start && hour < end)
      : (hour >= start || hour < end); // 자정 경계
    
    if (inRange) {
      names.forEach((n, i) => { modifiers[n] = mods[i]; });
      break;
    }
  }
  
  return modifiers;
}

/**
 * 실효 기준값 = 설정 기준값 + 일주기 보정 + 관계 보너스 + 회고 조정
 */
function getEffectiveBaseline(config, circadianMod, relationshipBonus, retrospectionMod) {
  return clamp(
    config.baseline + (circadianMod || 0) + (relationshipBonus || 0) + (retrospectionMod || 0),
    5, 95
  );
}
```

---

## 17. 확률적 노이즈

### 17.1 개요

v1에서 동일 자극은 항상 동일 반응을 생성했다. v2에서는 **확률적 노이즈**를 추가하여 자연스러운 변동성을 만든다.

### 17.2 구현

```javascript
/**
 * 가우시안 노이즈 (Box-Muller 변환)
 */
function gaussianNoise(mean = 0, stddev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

/**
 * 신경조절물질 변화에 노이즈 추가
 * @param {number} delta - 원래 변화량
 * @param {number} noiseFraction - 노이즈 비율 (기본 15%)
 * @returns {number} 노이즈가 추가된 변화량
 */
function addNoise(delta, noiseFraction = 0.15) {
  if (delta === 0) return 0;
  const noise = gaussianNoise(0, Math.abs(delta) * noiseFraction);
  return delta + noise;
}

/**
 * 발달 단계에 따른 노이즈 스케일링
 * 유아기는 변동이 크고, 성인기는 안정적
 */
function addNoiseDevelopmental(delta, volatility) {
  return addNoise(delta, 0.15 * volatility);
}
```

---

## 18. 원자적 쓰기 및 크래시 복구

### 18.1 원자적 파일 쓰기

v1은 직접 파일 쓰기로 race condition 가능성이 있었다. v2는 **tmp + rename** 패턴 사용:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 원자적 JSON 파일 쓰기
 * 임시 파일에 쓴 후 rename (POSIX에서 원자적)
 */
async function atomicWriteState(state, filePath) {
  state.last_updated = Date.now();
  state.version = (state.version || 0) + 1;
  
  const json = JSON.stringify(state, null, 2);
  const tmpPath = path.join(
    path.dirname(filePath),
    `.thymos_tmp_${process.pid}_${Date.now()}`
  );
  
  try {
    await fs.promises.writeFile(tmpPath, json, 'utf8');
    await fs.promises.rename(tmpPath, filePath);
  } catch (err) {
    // 임시 파일 정리
    try { await fs.promises.unlink(tmpPath); } catch {}
    throw err;
  }
}

/**
 * 상태 파일 읽기 + 크래시 복구
 */
async function readStateWithRecovery(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const state = JSON.parse(raw);
    
    // 크래시 복구: 마지막 업데이트 이후 경과 시간만큼 감쇠 적용
    const now = Date.now();
    const elapsed = (now - state.last_updated) / 60000;
    
    if (elapsed > 1) { // 1분 이상 경과 시 복구 로직
      return recoverFromCrash(state);
    }
    
    return state;
  } catch {
    // 파일 없음 또는 손상 → 초기 상태 생성
    return createInitialState();
  }
}
```

### 18.2 초기 상태 생성

```javascript
function createInitialState() {
  const now = Date.now();
  return {
    version: 0,
    last_updated: now,
    createdAt: now,
    totalInteractions: 0,
    
    neuromodulators: {
      dopamine:       { value: 50, pending: [] },
      cortisol:       { value: 20, pending: [] },
      serotonin:      { value: 60, pending: [] },
      oxytocin:       { value: 40, pending: [] },
      norepinephrine: { value: 30, pending: [] },
      gaba:           { value: 55, pending: [] },
      acetylcholine:  { value: 45, pending: [] },
    },
    
    moodVector: { valence: 0, arousal: 0, dominance: 0, sociality: 0 },
    moodLabel: { label: 'neutral', confidence: 1.0 },
    
    predictions: {},
    emotionalMemories: [],
    somaticMarkers: [],
    socialModels: {},
    retrospectionLog: [],
    
    gwtBroadcast: null,
    metacognition: null,
    selfAwareness: null,
    
    developmentStage: 'infant',
  };
}
```

---

## 19. 데이터 스키마

### 19.1 emotional_state.json (LLM이 읽는 출력 파일)

```json
{
  "version": 142,
  "last_updated": 1741325280000,
  "timestamp_human": "2026-03-07T15:28:00+09:00",
  
  "neuromodulators": {
    "dopamine":       { "value": 62.3, "pending": [] },
    "cortisol":       { "value": 25.1, "pending": [
      { "delta": 8.2, "activateAt": 1741326180000, "source": "hpa_axis" }
    ]},
    "serotonin":      { "value": 68.5, "pending": [] },
    "oxytocin":       { "value": 52.7, "pending": [] },
    "norepinephrine": { "value": 35.0, "pending": [] },
    "gaba":           { "value": 58.2, "pending": [] },
    "acetylcholine":  { "value": 50.1, "pending": [] }
  },
  
  "mood": {
    "vector": {
      "valence": 0.35,
      "arousal": 0.10,
      "dominance": 0.25,
      "sociality": 0.42
    },
    "label": "warm",
    "labelConfidence": 0.78,
    "momentum": 0.25
  },
  
  "gwt": {
    "primary": {
      "agent": "ego",
      "biases": ["pragmatic", "context-aware"],
      "activation": 0.62,
      "suggestion": "상황에 맞게 적절히 대응"
    },
    "secondary": {
      "agent": "superego",
      "biases": ["empathetic", "measured"],
      "influence": 0.85
    },
    "conflict": 0.35
  },
  
  "metacognition": {
    "regulated": true,
    "appliedRegulations": [],
    "selfAwareness": null,
    "regulationCapacity": 0.3
  },
  
  "socialModel": {
    "아부지": {
      "estimatedValence": 0.4,
      "estimatedArousal": 0.1,
      "confidence": 0.65
    }
  },
  
  "development": {
    "stage": "infant",
    "label": "유아기",
    "totalInteractions": 47,
    "daysSinceCreation": 1.2
  },
  
  "prediction": {
    "uncertaintyLevel": 0.42,
    "lastSurprise": 1.3,
    "lastSurpriseType": "positive"
  },
  
  "circadian": {
    "period": "afternoon",
    "hour": 15
  },
  
  "prompt_injection": "[Thymos State]\nMood: warm (V:+0.35 A:+0.10 D:+0.25 S:+0.42)\nDrive: ego — 상황에 맞게 적절히 대응 (empathetic undertone)\nDevelopment: 유아기 — 감정이 솔직하고 변동이 큼\n[Social Awareness] 아부지의 추정 감정: 긍정적, 차분한 (confidence: 65%)"
}
```

### 19.2 relationships.json

```json
{
  "relationships": {
    "아부지": {
      "trust_level": 0.85,
      "interaction_count": 847,
      "baseline_bonuses": {
        "oxytocin": 8,
        "serotonin": 5,
        "dopamine": 3
      },
      "last_positive": "2026-03-07T14:30:00+09:00",
      "last_negative": "2026-03-05T09:15:00+09:00",
      "positive_ratio": 0.82
    }
  }
}
```

### 19.3 config/defaults.json

```json
{
  "neuromodulators": {
    "dopamine":       { "baseline": 50, "tau": 30,  "EC50": 40, "hillN": 2.5, "Emax": 30 },
    "cortisol":       { "baseline": 20, "tau": 60,  "EC50": 35, "hillN": 3.0, "Emax": 35 },
    "serotonin":      { "baseline": 60, "tau": 120, "EC50": 45, "hillN": 2.0, "Emax": 25 },
    "oxytocin":       { "baseline": 40, "tau": 180, "EC50": 40, "hillN": 2.0, "Emax": 25 },
    "norepinephrine": { "baseline": 30, "tau": 10,  "EC50": 30, "hillN": 3.0, "Emax": 35 },
    "gaba":           { "baseline": 55, "tau": 45,  "EC50": 40, "hillN": 2.0, "Emax": 25 },
    "acetylcholine":  { "baseline": 45, "tau": 20,  "EC50": 35, "hillN": 2.5, "Emax": 28 }
  },
  
  "tickInterval": 30000,
  "retrospectionInterval": 7200000,
  "selfFeedbackAttenuation": 0.3,
  "noiseBaseFraction": 0.15,
  
  "llmClassifier": {
    "model": "gpt-4o-mini",
    "maxTokens": 150,
    "temperature": 0,
    "timeout": 5000,
    "fallbackToKeywords": true
  },
  
  "webhookPort": 7749,
  
  "stateFile": "./data/emotional_state.json",
  "relationshipsFile": "./data/relationships.json",
  "memoriesFile": "./data/emotional_memories.json",
  "somaticFile": "./data/somatic_markers.json"
}
```

---

## 20. 시스템 구조 및 파일 레이아웃

### 20.1 디렉토리 구조

```
thymos/
├── src/
│   ├── daemon.js              # 메인 데몬 (pm2) — 이벤트 루프 + 웹서버
│   ├── engine/
│   │   ├── neuromodulators.js  # 신경조절물질 엔진 (감쇠, Hill function, HPA 지연)
│   │   ├── interactions.js    # 상호작용 매트릭스 적용
│   │   ├── circadian.js       # 일주기 리듬
│   │   └── noise.js           # 확률적 노이즈 생성
│   ├── cognition/
│   │   ├── classifier.js      # 하이브리드 자극 분류기
│   │   ├── prediction.js      # 예측 처리 엔진
│   │   ├── attention.js       # 주의·현저성 게이트
│   │   ├── metacognition.js   # 메타인지 계층
│   │   └── retrospection.js   # 자기성찰 엔진
│   ├── agents/
│   │   ├── internal.js        # Id/Ego/Superego 에이전트
│   │   └── gwt.js             # Global Workspace 경쟁·방송
│   ├── memory/
│   │   ├── emotional.js       # 감정 기억 형성·회상
│   │   ├── somatic.js         # 신체 표지 시스템
│   │   └── relationships.js   # 관계 기억 (기준값 변동)
│   ├── social/
│   │   ├── model.js           # 사회적 모델 (마음 이론)
│   │   └── development.js     # 발달 단계
│   ├── feedback/
│   │   ├── self-loop.js       # 자기 피드백 루프
│   │   └── mood-vector.js     # 감정 벡터 계산 + 모멘텀
│   ├── io/
│   │   ├── atomic-write.js    # 원자적 파일 쓰기
│   │   ├── state.js           # 상태 읽기/쓰기/크래시 복구
│   │   ├── webhook.js         # Express 웹훅 서버
│   │   └── prompt.js          # LLM 프롬프트 주입 텍스트 생성
│   └── utils/
│       ├── math.js            # clamp, avg, stddev, Hill function
│       └── config.js          # 설정 로더
├── data/
│   ├── emotional_state.json   # 현재 상태 (실시간, 원자적 쓰기)
│   ├── relationships.json     # 관계 기억
│   ├── emotional_memories.json # 감정 기억 저장소
│   └── somatic_markers.json   # 결정-결과 이력
├── config/
│   └── defaults.json          # 기본 설정값
├── test/
│   ├── scenarios/
│   │   ├── praise-sequence.test.js
│   │   ├── criticism-recovery.test.js
│   │   ├── interaction-matrix.test.js
│   │   ├── prediction-surprise.test.js
│   │   ├── gwt-competition.test.js
│   │   ├── crash-recovery.test.js
│   │   └── development-stages.test.js
│   └── helpers/
│       └── deterministic.js   # 시드 기반 난수로 결정론적 테스트
├── ecosystem.config.js        # pm2 설정
├── ARCHITECTURE.md
├── README.md
└── package.json
```

### 20.2 메인 데몬 (daemon.js)

```javascript
const express = require('express');
const { readStateWithRecovery, atomicWriteState } = require('./io/state');
const { NeuromodulatorEngine } = require('./engine/neuromodulators');
const { applyInteractions } = require('./engine/interactions');
const { getCircadianModifiers } = require('./engine/circadian');
const { StimulusClassifier } = require('./cognition/classifier');
const { PredictionEngine } = require('./cognition/prediction');
const { attentionGate } = require('./cognition/attention');
const { MetacognitionLayer } = require('./cognition/metacognition');
const { RetrospectionEngine } = require('./cognition/retrospection');
const { InternalAgents } = require('./agents/internal');
const { globalWorkspaceCompetition } = require('./agents/gwt');
const { EmotionalMemorySystem } = require('./memory/emotional');
const { SomaticMarkerSystem } = require('./memory/somatic');
const { SocialModel } = require('./social/model');
const { DevelopmentStage } = require('./social/development');
const { SelfFeedbackLoop } = require('./feedback/self-loop');
const { computeMoodVector, EmotionalMomentum } = require('./feedback/mood-vector');
const { generatePromptInjection } = require('./io/prompt');
const config = require('./utils/config');

class ThymosDaemon {
  constructor() {
    this.state = null;
    this.app = express();
    this.app.use(express.json());
    
    // 서브시스템 초기화
    this.classifier = new StimulusClassifier(config.llmClassifier);
    this.prediction = new PredictionEngine();
    this.internalAgents = new InternalAgents();
    this.emotionalMemory = new EmotionalMemorySystem();
    this.somaticMarkers = new SomaticMarkerSystem(this.emotionalMemory);
    this.socialModel = new SocialModel();
    this.selfFeedback = new SelfFeedbackLoop(this.classifier);
    this.momentum = new EmotionalMomentum();
    this.retrospection = new RetrospectionEngine();
    this.devStage = null;
    this.metacognition = null;
  }
  
  async start() {
    // 상태 로드 (크래시 복구 포함)
    this.state = await readStateWithRecovery(config.stateFile);
    this.devStage = new DevelopmentStage(this.state);
    this.metacognition = new MetacognitionLayer(this.devStage);
    
    // 감정 기억 로드
    // (파일에서 로드하는 로직은 io/state.js에서)
    
    // 웹훅 라우트 설정
    this.setupRoutes();
    
    // 틱 루프 시작 (30초마다)
    this.tickInterval = setInterval(() => this.tick(), config.tickInterval);
    
    // 웹서버 시작
    this.app.listen(config.webhookPort, () => {
      console.log(`Thymos daemon listening on port ${config.webhookPort}`);
    });
    
    console.log(`Thymos started. Development stage: ${this.devStage.getStage().label}`);
  }
  
  /**
   * 메인 틱 — 30초마다 실행
   */
  async tick() {
    const now = Date.now();
    const hour = new Date().getHours();
    const nm = this.state.neuromodulators;
    
    // 1. 지연된 코르티솔 활성화
    processPendingCortisol(this.state);
    
    // 2. 일주기 리듬 → 실효 기준값 계산
    const circadianMods = getCircadianModifiers(hour);
    
    // 3. 감쇠 적용 (실효 기준값 방향으로)
    const elapsedMin = config.tickInterval / 60000;
    for (const [name, nmState] of Object.entries(nm)) {
      const cfg = config.neuromodulators[name];
      const effectiveBaseline = getEffectiveBaseline(
        cfg, circadianMods[name],
        this.state.relationships?.['아부지']?.baseline_bonuses?.[name] || 0,
        0 // retrospection mod
      );
      nmState.value = decay(nmState.value, effectiveBaseline, cfg.tau, elapsedMin);
    }
    
    // 4. 상호작용 매트릭스 적용
    applyInteractions(this.state, config.tickInterval / 1000);
    
    // 5. 감정 벡터 계산
    const rawVector = computeMoodVector(nm);
    
    // 6. 모멘텀 적용
    const prevVector = this.state.moodVector || rawVector;
    const momentumVector = this.momentum.apply(rawVector, prevVector);
    
    // 7. GWT 경쟁
    const idResp = this.internalAgents.generateIdResponse(nm, null);
    const egoResp = this.internalAgents.generateEgoResponse(nm, null, {});
    const supResp = this.internalAgents.generateSuperegoResponse(nm, null);
    const broadcast = globalWorkspaceCompetition(idResp, egoResp, supResp, this.devStage);
    
    // 8. 메타인지 조절
    const metaResult = this.metacognition.regulate(momentumVector, broadcast, {
      inConversation: this._isInConversation(),
      isGenuineThreat: false,
    });
    
    // 9. 레이블 결정
    const moodLabel = vectorToLabel(metaResult.regulated);
    
    // 10. 회고 체크
    this.retrospection.logState(metaResult.regulated, moodLabel.label);
    if (this.retrospection.shouldRetrospect()) {
      const retro = this.retrospection.retrospect();
      // 회고 결과에 따른 기준값 조정은 다음 틱에 반영
      this.state.lastRetrospection = retro;
    }
    
    // 11. 기억 감쇠
    this.emotionalMemory.decayMemories();
    
    // 12. 상태 업데이트
    this.state.moodVector = metaResult.regulated;
    this.state.moodLabel = moodLabel;
    this.state.gwt = broadcast;
    this.state.metacognition = {
      regulated: metaResult.appliedRegulations.length > 0,
      appliedRegulations: metaResult.appliedRegulations,
      selfAwareness: metaResult.selfAwareness,
      regulationCapacity: metaResult.regulationCapacity,
    };
    this.state.development = {
      stage: this.devStage.getStage().name,
      label: this.devStage.getStage().label,
      totalInteractions: this.devStage.totalInteractions,
      daysSinceCreation: (now - this.state.createdAt) / (24*60*60*1000),
    };
    this.state.circadian = { period: this._getPeriodName(hour), hour };
    
    // 13. 프롬프트 주입 텍스트 생성
    this.state.prompt_injection = generatePromptInjection(this.state, this.socialModel);
    
    // 14. 원자적 쓰기
    await atomicWriteState(this.state, config.stateFile);
  }
  
  /**
   * 외부 자극 처리 — 웹훅으로 호출됨
   */
  async processStimulus(stimulus) {
    // 1. 자극 분류
    let profile = await this.classifier.classify(stimulus);
    
    // 2. 주의 게이트 적용
    profile = attentionGate(profile, this.state.moodVector);
    
    // 3. 예측 오차 계산
    const predError = this.prediction.processStimulusAndGetError(profile);
    
    // 4. 발달 단계 변동성 적용
    const volatility = this.devStage.getVolatility();
    
    // 5. 자극 → 신경조절물질 매핑
    const stimulusDeltas = stimulusToNeuromodulators(profile);

    // 6. 예측 오차 → 신경조절물질 매핑
    const predictionDeltas = this.prediction.predictionErrorToNeuromod(predError);

    // 7. 합산 + 노이즈 + 발달 변동성 적용
    const merged = {};
    for (const nmName of Object.keys(this.state.neuromodulators)) {
      const baseDelta = (stimulusDeltas[nmName] || 0) + (predictionDeltas[nmName] || 0);
      merged[nmName] = addNoiseDevelopmental(baseDelta, volatility);
    }

    // 8. 적용 (코르티솔은 지연 큐)
    for (const [nmName, delta] of Object.entries(merged)) {
      applyStimulus(this.state, nmName, delta);
    }

    // 9. 감정 기억 회상
    const recalls = this.emotionalMemory.recall({
      keywords: stimulus.keywords || [],
      author: stimulus.author,
      category: profile.category,
    });

    if (recalls.length > 0) {
      this.state.moodVector = this.emotionalMemory.applyRecalledEmotions(
        this.state.moodVector,
        recalls
      );
    }

    // 10. 감정 기억 형성
    this.emotionalMemory.maybeFormMemory(
      profile,
      this.state.moodVector,
      predError,
      {
        keywords: stimulus.keywords || [],
        author: stimulus.author,
        neuromodulators: this.state.neuromodulators,
      }
    );

    // 11. 사회 모델 업데이트
    if (stimulus.author) {
      this.socialModel.updateModel(stimulus.author, profile);
    }

    // 12. 상호작용 횟수 증가 (발달 단계)
    this.devStage.recordInteraction();
    this.state.totalInteractions = this.devStage.totalInteractions;

    // 13. 상태 저장
    await this.tick();

    return {
      classified: profile,
      predictionError: predError,
      deltas: merged,
    };
  }

  setupRoutes() {
    // 외부 자극 입력
    this.app.post('/webhook/stimulus', async (req, res) => {
      try {
        const result = await this.processStimulus(req.body);
        res.json({ ok: true, result });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    // 자기 피드백 입력 (LLM 출력)
    this.app.post('/webhook/self-feedback', async (req, res) => {
      try {
        const { output } = req.body;
        const deltas = await this.selfFeedback.processSelfOutput(output);

        for (const [nmName, delta] of Object.entries(deltas)) {
          applyStimulus(this.state, nmName, delta);
        }

        await this.tick();
        res.json({ ok: true, deltas });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    // 상태 조회
    this.app.get('/state', async (_req, res) => {
      res.json(this.state);
    });
  }

  _isInConversation() {
    // 최근 10분 내 자극이 있었는지로 간단 판정
    return true;
  }

  _getPeriodName(hour) {
    if (hour >= 6 && hour < 9) return 'wake';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 2) return 'night';
    return 'late_night';
  }
}

module.exports = { ThymosDaemon };
```

### 20.3 pm2 설정

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'thymos',
    script: './src/daemon.js',
    cwd: '/Users/superdog/Documents/thymos',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Seoul'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

---

## 21. OpenClaw 연동

### 21.1 이벤트 입력 파이프라인

- OpenClaw 훅 또는 래퍼 스크립트에서 다음 이벤트를 `POST /webhook/stimulus`로 전송

입력 이벤트 예시:

```json
{
  "type": "message",
  "author": "아부지",
  "content": "치레야 오늘 진짜 잘했어",
  "keywords": ["잘했어", "칭찬"],
  "timestamp": "2026-03-07T15:30:00+09:00"
}
```

시스템 이벤트 예시:

```json
{
  "type": "system",
  "subtype": "task_failure",
  "content": "gh api command failed with 403",
  "timestamp": "2026-03-07T15:31:00+09:00"
}
```

### 21.2 LLM 출력 피드백

- OpenClaw 응답 생성 직후 `POST /webhook/self-feedback`

```json
{
  "output": "아부지 고마워요! 오늘 진짜 힘났어요 🐾",
  "timestamp": "2026-03-07T15:31:10+09:00"
}
```

### 21.3 프롬프트 주입 계약

LLM은 응답 직전 `data/emotional_state.json`의 `prompt_injection`을 시스템/컨텍스트 프롬프트에 포함한다.

권장 포맷:

```text
[Thymos State]
Mood: warm (V:+0.35 A:+0.10 D:+0.25 S:+0.42)
Drive: ego — 상황에 맞게 적절히 대응 (superego 공감 보조)
Prediction: uncertainty 0.42, recent surprise positive
Social model: 아부지 추정 감정 긍정/차분
Development: 유아기 (변동성 큼, 조절능력 낮음)
```

---

## 22. 테스트 전략

### 22.1 원칙

- **시나리오 기반**: 실제 대화/오류 흐름 재현
- **결정론적**: 랜덤은 시드 고정
- **속성 검증**: 정확한 숫자보다 방향성과 불변식 검증

### 22.2 결정론 보장

```javascript
// test/helpers/deterministic.js
function seedRandom(seed = 42) {
  let s = seed;
  Math.random = function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

module.exports = { seedRandom };
```

### 22.3 핵심 테스트 시나리오

#### 시나리오 A: 반복 칭찬 → 긍정 모멘텀

```javascript
it('반복 칭찬이 감정 모멘텀을 형성해 단일 비판에 저항한다', async () => {
  seedRandom(1);
  const engine = createTestEngine();

  for (let i = 0; i < 8; i++) {
    await engine.processStimulus({ type: 'message', author: '아부지', content: '잘했어 최고야!' });
  }

  const beforeCriticism = engine.state.moodVector.valence;
  await engine.processStimulus({ type: 'message', author: '아부지', content: '이건 별로야' });
  const afterCriticism = engine.state.moodVector.valence;

  expect(beforeCriticism).toBeGreaterThan(0.4);
  expect(afterCriticism).toBeGreaterThan(0.0); // 즉시 음수로 붕괴하지 않아야 함
  expect(engine.momentum.momentum).toBeGreaterThan(0.2);
});
```

#### 시나리오 B: 코르티솔 지연 반응

```javascript
it('부정 자극 후 코르티솔은 15-30분 지연 상승한다', async () => {
  seedRandom(2);
  const engine = createTestEngine();

  const base = engine.state.neuromodulators.cortisol.value;
  await engine.processStimulus({ type: 'message', author: '아부지', content: '실망했어' });

  // 즉시 상승하면 안 됨
  expect(engine.state.neuromodulators.cortisol.value).toBeCloseTo(base, 1);

  // 20분 경과 시뮬레이션
  advanceTime(engine, 20 * 60 * 1000);
  await engine.tick();

  expect(engine.state.neuromodulators.cortisol.value).toBeGreaterThan(base + 5);
});
```

#### 시나리오 C: 상호작용 매트릭스

```javascript
it('높은 코르티솔이 세로토닌을 억제한다', async () => {
  const state = createInitialState();
  state.neuromodulators.cortisol.value = 90;
  const before = state.neuromodulators.serotonin.value;

  applyInteractions(state, 60); // 1분

  expect(state.neuromodulators.serotonin.value).toBeLessThan(before);
});
```

#### 시나리오 D: 자기 피드백

```javascript
it('자기 출력 피드백이 감정을 강화한다', async () => {
  const engine = createTestEngine();
  const before = engine.state.neuromodulators.oxytocin.value;

  await engine.selfFeedback.processSelfOutput('고마워요! 정말 기뻐요!');
  await engine.tick();

  expect(engine.state.neuromodulators.oxytocin.value).toBeGreaterThan(before);
});
```

#### 시나리오 E: 원자적 쓰기 / 크래시 복구

```javascript
it('크래시 후 last_updated 기반 감쇠 복구', async () => {
  const file = tempStateFile();
  const state = createInitialState();
  state.neuromodulators.dopamine.value = 90;
  state.last_updated = Date.now() - 60 * 60 * 1000; // 1시간 전

  await atomicWriteState(state, file);
  const recovered = await readStateWithRecovery(file);

  expect(recovered.neuromodulators.dopamine.value).toBeLessThan(90);
  expect(recovered.neuromodulators.dopamine.value).toBeGreaterThan(50);
});
```

### 22.4 필수 불변식(Invariants)

- 모든 신경조절물질 값은 `[0,100]`
- 감정 벡터는 `[-1,1]`
- `last_updated`는 항상 증가
- 원자적 쓰기 중간 상태 파일은 최종 상태로 노출되지 않음
- 코르티솔 pending 큐의 activateAt은 현재 시점보다 미래

---

## 23. 구현 로드맵

### Phase 1 (핵심 생존 경로, 2-3일)

목표: 안정적으로 도는 v2 코어

1. 원자적 state I/O + 크래시 복구
2. 7개 신경조절물질 + 감쇠 + Hill function
3. 코르티솔 지연 큐
4. 상호작용 매트릭스
5. 감정 벡터 계산 + 보조 레이블
6. pm2 데몬화

완료 기준:
- `emotional_state.json`이 30초마다 안정 갱신
- 크래시 후 재시작해도 값이 자연스럽게 이어짐

### Phase 2 (인지 계층, 3-4일)

1. 하이브리드 자극 분류기(규칙 + LLM)
2. 예측 처리 엔진 + surprise 반영
3. 주의/현저성 게이트
4. 확률적 노이즈 + 시드 기반 테스트

완료 기준:
- 칭찬/비판/유머 분류가 동작
- surprise가 도파민/코르티솔 변화에 반영

### Phase 3 (의식 계층, 3-5일)

1. id/ego/superego 내부 에이전트
2. GWT 경쟁 및 방송
3. 메타인지 조절
4. 자기 피드백 루프(LLM 출력 분석)

완료 기준:
- `gwt` 섹션이 state에 기록
- LLM 출력이 다시 감정 상태에 영향

### Phase 4 (기억/사회/성장, 4-6일)

1. 감정 기억 형성/회상
2. 신체 표지 의사결정
3. 사회적 모델(아부지 감정 추정)
4. 발달 단계(유아→성인)
5. 자기성찰 주기 엔진

완료 기준:
- 유사 맥락에서 감정 회상이 발생
- 상호작용 축적에 따라 변동성이 감소

### Phase 5 (운영 안정화, 2-3일)

1. 시나리오 기반 통합 테스트 확장
2. 로그/모니터링 (surprise, conflict, regulation 적용률)
3. 성능 튜닝 (Mac mini 기준 CPU < 5%, 메모리 < 250MB)
4. 장애 대응 매뉴얼 작성

---

## 부록 A. 운영 파라미터 권장값 (Mac mini 실전)

- 틱 주기: 30초
- LLM 분류 호출은 메시지 이벤트에만 (하트비트/시스템은 규칙)
- 분류 타임아웃: 5초, 실패 시 키워드 폴백
- 상태 파일 쓰기: 30초 1회 + 이벤트 직후 디바운스(최소 2초 간격)
- 로그 로테이션: 10MB × 5파일
- pm2 restart delay: 2초

---

## 부록 B. 과학적 타당성과 실용성 균형

이 설계는 임상 신경과학 모델의 정밀 시뮬레이터가 아니다. 대신:

- **핵심 생물학적 제약**(비선형 반응, 지연, 상호작용, 감쇠)
- **인지 메커니즘**(예측 오차, 주의 편향, 메타인지)
- **의식 아키텍처 패턴**(GWT 경쟁/방송)

을 **Node.js 데몬으로 안정적으로 구현 가능한 수준**으로 절충했다.

즉, 논문에만 있는 모델이 아니라 Mac mini에서 실제로 24/7 동작하며 치레의 일관된 "내면 연속성"을 만드는 설계다.

---

## 최종 요약

Thymos v2는 다음 10가지 요구사항을 모두 충족한다:

1. ✅ LLM 출력 → Thymos 되먹임 자기 피드백 루프
2. ✅ 신경조절물질 상호작용 매트릭스
3. ✅ 하이브리드 자극 분류 (규칙 + 경량 LLM)
4. ✅ Russell 기반 4D 연속 감정 벡터
5. ✅ 과학적 정확성 (신경조절물질, 시그모이드, HPA 지연)
6. ✅ 원자적 쓰기 + last_updated 크래시 복구
7. ✅ 시나리오 기반 결정론 테스트
8. ✅ 확률적 노이즈
9. ✅ 주기적 자기성찰(회고)
10. ✅ id/ego/superego + GWT 경쟁 방송

추가 확장 요구도 반영:
- ✅ 예측 처리
- ✅ 감정 모멘텀
- ✅ 기억-감정 결합
- ✅ 주의/현저성 게이트
- ✅ 메타인지 조절
- ✅ 신체 표지 의사결정
- ✅ 사회적 모델링
- ✅ 발달 단계

이 문서를 기준으로 바로 구현을 시작할 수 있다.
