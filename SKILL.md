# Thymos — Emotion Layer Skill

Thymos는 AI 에이전트에게 연속적인 감정 상태를 부여하는 OpenClaw Skill입니다.

## 이 Skill이 하는 일

이 Skill을 로드하면, 에이전트는 매 응답 전에 Thymos 감정 상태를 읽고 행동에 반영합니다.

**기본 동작 (Thymos 데몬 없어도 동작):**
- `~/Documents/thymos/data/emotional_state.json` 파일이 존재하면 읽기
- `prompt_injection` 필드의 내용을 응답 스타일에 반영
- `Tone:` 지시에 따라 따뜻하게/간결하게/신중하게 톤 조절
- 파일이 없으면 이 단계를 건너뜀 (에러 없음)

**선택적 동작 (Thymos 데몬 실행 중일 때):**
- 실시간 감정 상태 반영 (30초마다 갱신됨)
- 관계 기억, 발달 단계, 예측 처리 포함

## 사용 방법

### 기본 (파일만 있으면 됨)

매 응답 전:

```
emotional_state.json의 prompt_injection 필드를 읽는다.
해당 내용을 이번 응답의 톤 지시로 사용한다.
예:
  Tone: respond warmly and enthusiastically → 따뜻하고 적극적으로
  Tone: respond briefly, more reserved → 간결하고 거리감 있게
파일이 없거나 읽기 실패 시 → 무시하고 정상 응답
```

### 고급 (Thymos 데몬 설치)

Thymos 데몬을 설치하면 실시간 감정 시뮬레이션이 활성화됩니다.

설치는 선택사항이며 사용자가 직접 판단합니다:

1. [GitHub 저장소](https://github.com/paperbags1103-hash/thymos)에서 코드 확인
2. 신뢰할 수 있다고 판단되면 로컬에 클론 + 설치
3. 외부 서버로 데이터를 전송하지 않음 — [SECURITY.md](./SECURITY.md) 참고

## 감정 상태 예시

```
[Thymos State]
Mood: warm (V:+0.84 A:-0.22 D:+0.43 S:+0.61)
Drive: id - 적극적으로! (ego support), conflict 0.34
Development: infant
Tone: respond warmly and enthusiastically, use informal close language
```

- **V (valence)**: 긍정(+1) ↔ 부정(-1)
- **A (arousal)**: 흥분(+1) ↔ 차분(-1)
- **D (dominance)**: 주도적(+1) ↔ 수동적(-1)
- **S (sociality)**: 사교적(+1) ↔ 내향적(-1)

## 데이터 & 프라이버시

- 모든 감정 데이터는 **로컬에만** 저장됨 (`~/Documents/thymos/data/`)
- 외부 서버로 전송 없음
- 언제든 `data/*.json` 삭제로 초기화 가능
- Discord proactive messaging은 선택사항 (기본 비활성)
