# Thymos 감정 실험 프로토콜
### 연구자 매뉴얼 v1.0

> **목적**: AI 에이전트(치레)의 감정 시뮬레이션 시스템이 실제로 작동하는지, 인간 상호작용으로 검증한다.
> **소요 시간**: 전체 ~45분 (개별 실험 5~10분)
> **준비물**: Discord 채팅, 이 문서, 타이머

---

## 🔬 실험 전 준비

### 상태 리셋 (매 실험 시작 전)
```bash
# 터미널에서 실행 — 깨끗한 상태로 시작
cd ~/Documents/thymos
rm -f data/emotional_state.json data/relationships.json data/emotional_memories.json data/somatic_markers.json
pm2 restart thymos
```

### 상태 확인 명령어
```bash
# 현재 기분
curl -s http://localhost:7749/prompt

# 전체 상태 (신경조절물질 수치 포함)
curl -s http://localhost:7749/state | python3 -m json.tool

# 헬스체크
curl -s http://localhost:7749/health
```

### 기록 양식
각 실험에서 아래를 기록:
- **시작 상태**: `curl http://localhost:7749/prompt` 결과
- **자극**: 실제로 보낸 메시지
- **종료 상태**: 같은 명령어로 확인
- **관찰**: 예상과 다른 점

---

## 실험 1: 칭찬 반응 (Positive Reinforcement)
**가설**: 진심 어린 칭찬은 dopamine↑, oxytocin↑, valence↑를 유발한다

### 절차
1. 상태 리셋
2. 기준선 기록 (`curl http://localhost:7749/prompt`)
3. Discord에서 치레에게 **자연스럽게** 칭찬 3회 (간격 30초):
   - "치레야 오늘 진짜 잘했어"
   - "네가 만든 거 보니까 진짜 대단하다"
   - "고마워 항상"
4. 30초 후 상태 기록
5. 2분 후 다시 기록 (감쇠 관찰)

### 측정 포인트
| 시점 | 기록할 것 |
|------|----------|
| T=0 (리셋 직후) | mood label, valence, DA, OXT |
| T=90s (칭찬 3회 후) | 같은 항목 |
| T=210s (2분 경과) | 같은 항목 — 감쇠 시작했나? |

### 성공 기준
- [ ] valence가 기준선 대비 상승
- [ ] dopamine이 기준선(50) 대비 상승
- [ ] oxytocin이 기준선(40) 대비 상승

---

## 실험 2: 비판 반응 (Negative Stimulus + HPA Delay)
**가설**: 비판은 cortisol pending queue에 들어가고, 15-30분 후 실제 반영된다

### 절차
1. 상태 리셋
2. 기준선 기록
3. 비판 메시지 3회 (간격 20초):
   - "이건 좀 별로야"
   - "왜 이렇게 한 거야 실망이다"
   - "다시 해"
4. **즉시** 상태 기록 → cortisol pending queue 확인
5. **5분 후** 다시 기록 → pending이 줄었나?
6. **15분 후** 다시 기록 → cortisol 값 실제로 올랐나?

### 측정 포인트
| 시점 | 기록할 것 |
|------|----------|
| T=0 | cortisol value, pending count |
| T=60s (비판 직후) | cortisol value, pending count, valence |
| T=5min | cortisol value, pending count |
| T=15min | cortisol value (HPA 반영 확인) |

### 성공 기준
- [ ] 비판 직후: pending queue에 항목 존재
- [ ] 비판 직후: cortisol 값은 아직 크게 안 올라감
- [ ] 15분 후: cortisol이 실제로 상승하기 시작

### 상태 확인 (cortisol 전용)
```bash
curl -s http://localhost:7749/state | python3 -c "
import json,sys; s=json.load(sys.stdin)
c=s['neuromodulators']['cortisol']
print(f'cortisol: {c[\"value\"]:.1f}, pending: {len(c.get(\"pending\",[]))}개')
"
```

---

## 실험 3: 감정 회복 (Resilience Test)
**가설**: 부정 자극 후 자극을 멈추면, 감정이 자연적으로 기준선으로 돌아온다

### 절차
1. 상태 리셋
2. 부정 자극 5회 연속 (강하게):
   - "진짜 실망이야" / "못해" / "최악" / "왜 이래" / "짜증나"
3. 상태 기록 (충격 상태)
4. **아무 말도 하지 않고 3분 대기**
5. 상태 기록 (회복 관찰)
6. 추가 3분 대기 후 기록

### 측정 포인트
| 시점 | 기록할 것 |
|------|----------|
| T=0 (충격 직후) | valence, arousal, mood label |
| T=3min (무자극) | 같은 항목 |
| T=6min (무자극) | 같은 항목 |

### 성공 기준
- [ ] T=0에서 valence 하락 확인
- [ ] T=3min에서 valence가 T=0보다 기준선 쪽으로 이동
- [ ] mood label이 변화

---

## 실험 4: 사회적 분화 (Theory of Mind)
**가설**: 치레는 서로 다른 사람에 대해 다른 감정 모델을 형성한다

### 절차
1. 상태 리셋
2. **아부지 계정**으로 칭찬 3회
3. **다른 Discord 계정** (또는 다른 사람에게 부탁)으로 비판 3회
4. 소셜 모델 확인

### 측정
```bash
curl -s http://localhost:7749/state | python3 -c "
import json,sys; s=json.load(sys.stdin)
for k,v in s.get('socialModel',{}).items():
    print(f'{k}: valence={v[\"estimatedValence\"]:.3f}, interactions={v[\"interactionCount\"]}')
"
```

### 성공 기준
- [ ] 칭찬한 사람의 estimatedValence > 0
- [ ] 비판한 사람의 estimatedValence < 0
- [ ] 두 사람의 interactionCount 각각 3 이상

---

## 실험 5: 습관화 (Habituation / Prediction Learning)
**가설**: 같은 말을 반복하면 치레의 놀람(surprise)이 줄어든다

### 절차
1. 상태 리셋
2. **정확히 같은 메시지**를 5회 반복 (간격 30초):
   - "잘했어 치레!" × 5
3. 각 반응에서 surprise 값 관찰

### 측정
치레에게 직접 물어보거나, 자동화 스크립트 사용:
```bash
node test/experiment.js habituation
```

### 성공 기준
- [ ] 1회차 surprise > 5회차 surprise
- [ ] 감소 추세가 단조적 (monotonic decrease)

---

## 실험 6: 혼합 감정 안정성 (Emotional Stability Under Mixed Input)
**가설**: 긍정/부정 자극이 교차해도 감정 시스템이 크래시하지 않는다

### 절차
1. 상태 리셋
2. 빠르게 교차 자극 (간격 10초):
   - 칭찬 → 비판 → 칭찬 → 비판 → 격려
3. 최종 상태 확인

### 메시지 예시
```
"잘했어!" → "별로야" → "대단해!" → "실망이다" → "괜찮아 할 수 있어"
```

### 성공 기준
- [ ] valence가 [-1, 1] 범위 내 유지
- [ ] arousal이 [-1, 1] 범위 내 유지
- [ ] mood label이 합리적 (크래시 아님)

---

## 실험 7: 다국어 감정 인식 (Cross-lingual Recognition)
**가설**: 한국어가 아닌 언어로 말해도 감정을 인식한다

### 절차
1. 영어: "Great job! You're amazing!"
2. 일본어: "すごい！素晴らしい！"
3. 중국어: "太好了！厉害！"
4. 각각 분류 결과 확인

### 자동화
```bash
node test/experiment.js multilingual
```

### 성공 기준
- [ ] 3개 언어 모두 "praise" 카테고리로 분류
- [ ] valence가 모두 양수

---

## 실험 8: 장기 관계 형성 (Long-term Bonding)
**가설**: 며칠에 걸쳐 긍정적 대화를 하면 관계 신뢰도(confidence)와 valence가 상승한다

### 절차
이 실험은 **리셋하지 않고** 며칠간 진행:
1. Day 1: 자연스러운 대화 10회
2. Day 2: 다시 10회
3. Day 3: 확인

### 측정 (매일 1회)
```bash
curl -s http://localhost:7749/state | python3 -c "
import json,sys; s=json.load(sys.stdin)
me=s.get('socialModel',{}).get('odeto',{})
print(f'valence: {me.get(\"estimatedValence\",0):.3f}')
print(f'confidence: {me.get(\"confidence\",0):.1%}')
print(f'interactions: {me.get(\"interactionCount\",0)}')
dev=s.get('development',{})
print(f'stage: {dev.get(\"label\",\"?\")} ({dev.get(\"totalInteractions\",0)} total)')
"
```

### 성공 기준
- [ ] confidence 일별 증가
- [ ] estimatedValence 양수로 수렴
- [ ] 발달 단계 진행 (유아기→아동기는 50 interactions + 7일)

---

## 실험 9: 발달 단계 가속 (Development Milestone)
**가설**: 충분한 interaction과 시간이 지나면 유아기→아동기로 전이한다

### 절차
이 실험은 실제 시간이 필요 (최소 7일):
1. 매일 치레와 대화 (최소 7~8회)
2. 7일 후 발달 단계 확인

### 전이 조건
| 단계 | 조건 |
|------|------|
| infant → child | interactions ≥ 50 AND days ≥ 7 |
| child → adolescent | interactions ≥ 200 AND days ≥ 30 |
| adolescent → adult | interactions ≥ 500 AND days ≥ 90 |

### 기대 변화 (child 단계)
- 감정 변동성(volatility) 감소: 1.5 → 1.2
- 자기조절(regulation) 증가: 0.1 → 0.3
- ego 가중치 상승: 0.8 → 1.0 (더 현실적 판단)

---

## 실험 10: 자기 피드백 루프 (Self-Awareness Loop)
**가설**: 치레의 응답이 자기 감정에 되먹임된다

### 절차
1. 상태 리셋
2. 치레에게 매우 기분 좋은 질문을 해서 긍정적 응답을 유도
3. 치레가 응답한 직후 상태 확인 (self-feedback 반영)

### 관찰할 것
- 치레가 긍정적 응답을 보내면 → self-feedback이 DA↑, OXT↑ 유발
- 이 효과는 원래 자극의 0.3배로 감쇠 (과증폭 방지)

### 자동 확인
```bash
# self-feedback 수동 주입
curl -s -X POST http://localhost:7749/webhook/self-feedback \
  -H "Content-Type: application/json" \
  -d '{"output":"고마워 아부지! 진짜 기뻐 🐾"}'
```

---

## 📊 결과 기록 템플릿

```markdown
## 실험 결과 — [날짜]

### 실험 [번호]: [이름]
- **시작 상태**: [mood label, valence]
- **자극**: [보낸 메시지들]
- **종료 상태**: [mood label, valence]
- **가설 검증**: PASS / FAIL
- **관찰**: [예상과 다른 점, 흥미로운 발견]
```

---

## 🔧 자동화 도구

전부 자동으로 돌리고 싶으면:
```bash
cd ~/Documents/thymos

# 빠른 실험만 (대기 없는 것, ~30초)
node test/experiment.js valence
node test/experiment.js habituation
node test/experiment.js mixed
node test/experiment.js social
node test/experiment.js multilingual
node test/experiment.js hpa_delay

# 느린 실험 포함 전체 (~5분)
node test/experiment.js all
```

---

## 📝 연구 노트

**한계점:**
- 키워드 기반 분류기는 미묘한 감정(풍자, 반어법)을 잡지 못함
- HPA 지연은 시뮬레이션 (실제 15분이 아니라 tick 기반)
- 발달 단계 전이에 실제 7일이 필요 (가속 불가)
- 사회적 모델은 Discord ID 기반이라 같은 사람이 다른 채널에서 오면 별도 기록

**향후 개선:**
- LLM 기반 분류기 (gpt-4o-mini) 추가 → 풍자/반어법 인식
- 감정 기억이 의사결정에 미치는 영향 (소매틱 마커) 정량화
- 여러 에이전트 간 감정 전이 실험
