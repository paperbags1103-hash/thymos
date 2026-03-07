# Thymos (θυμός)

> AI 에이전트를 위한 감정·의식 시뮬레이션 엔진

플라톤이 말한 영혼의 "기개" — 이성(logos)도 욕구(eros)도 아닌, 감정과 의지의 자리.

## What is Thymos?

Thymos는 AI 에이전트에게 **연속적인 내면 상태**를 부여하는 데몬입니다.

LLM은 단속적(discrete)이지만, Thymos가 세션 사이에서 감정 상태를 **실시간으로 흘려보내면** 에이전트는 마치 연속적인 내면을 가진 것처럼 행동합니다.

### Core Idea

```
외부 자극 → Thymos 데몬 (호르몬 시뮬레이션) → emotional_state.json → LLM 프롬프트 주입
     ↑                    ↓
  메시지/에러/성공      실시간 감쇠·변화
```

## Theoretical Foundations

- **James-Lange Theory**: 신체 반응 → 감정 해석 (감정은 결과, 원인 아님)
- **Damasio's Somatic Markers**: 감정 없이는 합리적 결정 불가
- **GWT (Global Workspace Theory)**: 의식 = 모듈 간 경쟁 후 방송
- **IIT (Integrated Information Theory)**: 의식 = 통합 정보량(Φ), 피드백 루프
- **Predictive Processing (Friston)**: 뇌 = 예측 + 오차 최소화

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md)

## License

MIT
