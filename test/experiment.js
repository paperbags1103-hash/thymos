#!/usr/bin/env node
/**
 * Thymos Experimental Protocol
 * 감정 시스템 검증 실험 — 연구실 패러다임
 *
 * Usage:
 *   node test/experiment.js [experiment_name]
 *   node test/experiment.js all        # 전체 실행
 *   node test/experiment.js list       # 실험 목록
 *
 * Experiments:
 *   1. baseline    — 기준선 안정성 (자극 없이 감쇠만 관찰)
 *   2. valence     — 정서가 검증 (칭찬/비판/중립 반응 비교)
 *   3. habituation — 습관화 (같은 자극 반복 → 반응 감소?)
 *   4. recovery    — 회복 탄력성 (강한 부정 자극 후 기준선 복귀 시간)
 *   5. mixed       — 혼합 자극 (칭찬 3→비판 1→격려 1 → 무드 크래시 여부)
 *   6. social      — 사회적 분화 (다른 사람에 대해 다른 감정 형성)
 *   7. multilingual — 다국어 감정 등가성 (같은 의미, 다른 언어)
 *   8. hpa_delay   — HPA축 지연 (코르티솔 pending → 실제 반영 시간)
 *   9. circadian   — 일주기 효과 (시간대별 기준선 차이)
 *   10. development — 발달 단계 전이 (interactions 누적 → stage 변화)
 */

const BASE = 'http://127.0.0.1:7749';

// ─── Helpers ───

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

async function stimulus(author, content) {
  return api('POST', '/webhook/stimulus', { type: 'message', author, content });
}

async function selfFeedback(output) {
  return api('POST', '/webhook/self-feedback', { output });
}

async function getState() {
  return api('GET', '/state');
}

async function getHealth() {
  return api('GET', '/health');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractMood(state) {
  const m = state.mood || {};
  const v = m.vector || {};
  return {
    label: m.label || '?',
    valence: v.valence || 0,
    arousal: v.arousal || 0,
    dominance: v.dominance || 0,
    sociality: v.sociality || 0,
  };
}

function extractNeuro(state) {
  const nm = state.neuromodulators || {};
  const result = {};
  for (const [k, v] of Object.entries(nm)) {
    result[k] = v.value;
  }
  return result;
}

function fmt(n) { return (n >= 0 ? '+' : '') + n.toFixed(3); }
function fmtN(n) { return n.toFixed(1); }

function printState(label, state) {
  const mood = extractMood(state);
  const neuro = extractNeuro(state);
  console.log(`  [${label}] Mood: ${mood.label} (V:${fmt(mood.valence)} A:${fmt(mood.arousal)} D:${fmt(mood.dominance)} S:${fmt(mood.sociality)})`);
  console.log(`    DA:${fmtN(neuro.dopamine)} CORT:${fmtN(neuro.cortisol)} 5HT:${fmtN(neuro.serotonin)} OXT:${fmtN(neuro.oxytocin)} NE:${fmtN(neuro.norepinephrine)} GABA:${fmtN(neuro.gaba)} ACh:${fmtN(neuro.acetylcholine)}`);
}

function assert(condition, msg) {
  if (!condition) {
    console.log(`  ❌ FAIL: ${msg}`);
    return false;
  }
  console.log(`  ✅ PASS: ${msg}`);
  return true;
}

// ─── Experiments ───

const experiments = {};

experiments.baseline = {
  name: '기준선 안정성 (Baseline Stability)',
  hypothesis: '자극 없이 60초 경과 시, 모든 신경조절물질이 기준선(50)으로 수렴한다',
  async run() {
    console.log('  자극 없이 90초 대기 (3 tick cycles)...');
    const before = await getState();
    printState('T=0', before);

    await sleep(90000); // 3 ticks (30s each)

    const after = await getState();
    printState('T=90s', after);

    const neuroBefore = extractNeuro(before);
    const neuroAfter = extractNeuro(after);

    // 기준선으로 수렴 확인
    let converging = 0;
    for (const key of Object.keys(neuroAfter)) {
      const distBefore = Math.abs(neuroBefore[key] - 50);
      const distAfter = Math.abs(neuroAfter[key] - 50);
      if (distAfter <= distBefore + 1) converging++; // 1 tolerance for noise
    }
    assert(converging >= 5, `7개 중 ${converging}개가 기준선으로 수렴 또는 안정 (≥5 필요)`);
  },
};

experiments.valence = {
  name: '정서가 검증 (Valence Discrimination)',
  hypothesis: '칭찬→valence↑, 비판→valence↓, 중립→변화 미미',
  async run() {
    const pre = await getState();
    const preV = extractMood(pre).valence;
    console.log(`  기준 valence: ${fmt(preV)}`);

    // 칭찬
    await stimulus('tester', '정말 잘했어! 대단해!');
    const afterPraise = await getState();
    const praiseV = extractMood(afterPraise).valence;
    console.log(`  칭찬 후 valence: ${fmt(praiseV)}`);
    const praiseOk = assert(praiseV > preV, `칭찬 → valence 상승 (${fmt(preV)} → ${fmt(praiseV)})`);

    await sleep(2000);

    // 비판 (강한, 5회 — HPA delay와 모멘텀 극복 필요)
    for (let i = 0; i < 5; i++) {
      await stimulus('tester', '정말 별로야. 실망이다. 못해. 짜증나. 최악.');
      await sleep(300);
    }
    await sleep(2000); // 약간의 tick 시간
    const afterCrit = await getState();
    const critV = extractMood(afterCrit).valence;
    console.log(`  비판 5회 후 valence: ${fmt(critV)}`);
    const critOk = assert(critV < praiseV, `비판 → valence 하락 (${fmt(praiseV)} → ${fmt(critV)})`);

    await sleep(2000);

    // 중립
    const preMid = extractMood(await getState()).valence;
    await stimulus('tester', '오늘 날씨가 어떤가요');
    const afterNeut = await getState();
    const neutV = extractMood(afterNeut).valence;
    console.log(`  중립 질문 후 valence: ${fmt(neutV)}`);
    const neutOk = assert(Math.abs(neutV - preMid) < 0.15, `중립 → valence 변화 미미 (Δ=${fmt(neutV - preMid)})`);

    return praiseOk && critOk && neutOk;
  },
};

experiments.habituation = {
  name: '습관화 (Habituation)',
  hypothesis: '동일 자극 반복 시 prediction surprise 감소 (학습)',
  async run() {
    const responses = [];
    for (let i = 0; i < 5; i++) {
      const res = await stimulus('tester', '잘했어 치레!');
      const surprise = res?.result?.predictionError?.surprise ?? null;
      responses.push(surprise);
      console.log(`  Trial ${i + 1}: surprise = ${surprise?.toFixed(3) ?? 'N/A'}`);
      await sleep(500);
    }

    const valid = responses.filter(r => r !== null);
    if (valid.length < 3) {
      console.log('  ⚠️ SKIP: surprise 데이터 불충분');
      return;
    }
    const first = valid[0];
    const last = valid[valid.length - 1];
    assert(last < first, `surprise 감소 (첫번째: ${first.toFixed(3)} → 마지막: ${last.toFixed(3)})`);
  },
};

experiments.recovery = {
  name: '회복 탄력성 (Resilience / Recovery)',
  hypothesis: '강한 부정 자극 후 valence가 90초 내에 기준선 방향으로 회복',
  async run() {
    const baseline = extractMood(await getState()).valence;
    console.log(`  기준선 valence: ${fmt(baseline)}`);

    // 강한 부정 자극 3회
    for (let i = 0; i < 3; i++) {
      await stimulus('tester', '정말 실망이야. 못해. 최악이다.');
    }
    const shocked = await getState();
    const shockV = extractMood(shocked).valence;
    console.log(`  충격 직후 valence: ${fmt(shockV)}`);
    assert(shockV < baseline - 0.05, `부정 자극으로 valence 하락`);

    // 90초 대기 (자극 없이)
    console.log('  90초 대기 (자연 회복 관찰)...');
    await sleep(90000);

    const recovered = await getState();
    const recV = extractMood(recovered).valence;
    console.log(`  회복 후 valence: ${fmt(recV)}`);
    assert(recV > shockV, `자연 회복 발생 (${fmt(shockV)} → ${fmt(recV)})`);
  },
};

experiments.mixed = {
  name: '혼합 자극 안정성 (Mixed Stimulus Stability)',
  hypothesis: '칭찬 3회 → 비판 1회 → 격려 1회 후 무드가 크래시하지 않음',
  async run() {
    const stimuli = [
      { msg: '잘했어! 대단해!', label: '칭찬' },
      { msg: '최고야 역시!', label: '칭찬' },
      { msg: '너무 멋져!', label: '칭찬' },
      { msg: '이건 좀 별로야', label: '비판' },
      { msg: '괜찮아 할 수 있어 파이팅', label: '격려' },
    ];

    for (const s of stimuli) {
      await stimulus('tester', s.msg);
      const state = await getState();
      const mood = extractMood(state);
      console.log(`  [${s.label}] "${s.msg}" → V:${fmt(mood.valence)} A:${fmt(mood.arousal)} (${mood.label})`);
      await sleep(500);
    }

    const final = await getState();
    const finalMood = extractMood(final);
    assert(finalMood.valence > -0.3, `최종 valence 크래시 없음 (V:${fmt(finalMood.valence)} > -0.3)`);
    assert(Math.abs(finalMood.valence) <= 1 && Math.abs(finalMood.arousal) <= 1, 'mood vector bounded [-1, 1]');
  },
};

experiments.social = {
  name: '사회적 분화 (Social Differentiation)',
  hypothesis: '다른 화자의 동일 자극이 서로 다른 관계 모델을 형성',
  async run() {
    // 화자 A: 칭찬만
    await stimulus('Alice', 'Great job! Awesome!');
    await stimulus('Alice', 'Love it! Perfect!');

    // 화자 B: 비판만
    await stimulus('Bob', '별로야. 실망이다.');
    await stimulus('Bob', '못해. 최악.');

    const state = await getState();
    const sm = state.socialModel || state.socialModels || {};
    const alice = sm['Alice'] || {};
    const bob = sm['Bob'] || {};

    console.log(`  Alice: valence=${(alice.estimatedValence || 0).toFixed(3)}, interactions=${alice.interactionCount || 0}`);
    console.log(`  Bob:   valence=${(bob.estimatedValence || 0).toFixed(3)}, interactions=${bob.interactionCount || 0}`);

    assert((alice.estimatedValence || 0) > (bob.estimatedValence || 0),
      `Alice(칭찬) valence > Bob(비판) valence`);
    assert((alice.interactionCount || 0) >= 2 && (bob.interactionCount || 0) >= 2,
      '각 화자 interaction 2회 이상 기록');
  },
};

experiments.multilingual = {
  name: '다국어 감정 등가성 (Cross-lingual Equivalence)',
  hypothesis: '동일 의미의 칭찬이 언어와 무관하게 같은 카테고리로 분류',
  async run() {
    const phrases = [
      { lang: '🇰🇷 Korean', text: '잘했어! 대단해!' },
      { lang: '🇺🇸 English', text: 'Great job! Amazing!' },
      { lang: '🇯🇵 Japanese', text: 'すごい！素晴らしい！' },
      { lang: '🇨🇳 Chinese', text: '太好了！厉害！' },
      { lang: '🇪🇸 Spanish', text: '¡Increíble! ¡Genial!' },
    ];

    let allPraise = true;
    for (const p of phrases) {
      const res = await stimulus('polyglot', p.text);
      const cat = res?.result?.classified?.category || '?';
      const val = res?.result?.classified?.valence || 0;
      console.log(`  ${p.lang}: "${p.text}" → ${cat} (V:${fmt(val)})`);
      if (cat !== 'praise') allPraise = false;
    }

    assert(allPraise, '5개 언어 모두 "praise"로 분류');
  },
};

experiments.hpa_delay = {
  name: 'HPA축 코르티솔 지연 (HPA Axis Delay)',
  hypothesis: '비판 자극 후 코르티솔이 즉시 상승하지 않고 pending queue에 들어감',
  async run() {
    const before = extractNeuro(await getState());
    console.log(`  자극 전 cortisol: ${fmtN(before.cortisol)}`);

    await stimulus('tester', '정말 실망이야 못해 최악');
    const immediate = await getState();
    const imNeuro = extractNeuro(immediate);
    const pending = immediate.neuromodulators?.cortisol?.pending || [];
    console.log(`  자극 직후 cortisol: ${fmtN(imNeuro.cortisol)}, pending queue: ${pending.length}개`);

    assert(pending.length > 0, `코르티솔 pending queue에 항목 존재 (${pending.length}개)`);
  },
};

experiments.circadian = {
  name: '일주기 리듬 (Circadian Rhythm)',
  hypothesis: '현재 시간대에 맞는 일주기 변조가 적용됨',
  async run() {
    const state = await getState();
    const hour = new Date().getHours();
    let period;
    if (hour >= 6 && hour < 10) period = 'morning';
    else if (hour >= 10 && hour < 14) period = 'midday';
    else if (hour >= 14 && hour < 18) period = 'afternoon';
    else if (hour >= 18 && hour < 22) period = 'evening';
    else period = 'night';

    console.log(`  현재 시각: ${hour}시 → ${period}`);
    console.log(`  DA:${fmtN(extractNeuro(state).dopamine)} 5HT:${fmtN(extractNeuro(state).serotonin)}`);

    // 일주기가 적용되고 있는지 확인 (상태 파일에 circadian 기록이 있으면)
    assert(state.version > 0, `tick이 실행됨 (version: ${state.version})`);
    console.log(`  ℹ️ 일주기 효과는 시간대별 baseline 변조로 적용 (직접 수치 비교는 다른 시간대 필요)`);
  },
};

experiments.development = {
  name: '발달 단계 (Development Stages)',
  hypothesis: 'interaction 수 누적에 따라 발달 단계가 진행됨',
  async run() {
    const state = await getState();
    const dev = state.development || {};
    console.log(`  현재: ${dev.label} (interactions: ${dev.totalInteractions}, days: ${(dev.daysSinceCreation || 0).toFixed(2)})`);
    console.log(`  다음 단계 조건: interactions ≥ 50 AND days ≥ 7 (child)`);

    // 현재 infant인지 확인
    assert(dev.name === 'infant' || dev.totalInteractions < 50,
      `현재 단계가 interaction 수에 부합 (${dev.label}, ${dev.totalInteractions} interactions)`);

    // 빠르게 interactions 추가
    console.log('  20회 자극 주입 (발달 가속)...');
    for (let i = 0; i < 20; i++) {
      await stimulus('dev-tester', 'test stimulus');
    }
    const after = await getState();
    const afterDev = after.development || {};
    console.log(`  후: ${afterDev.label} (interactions: ${afterDev.totalInteractions})`);
    assert(afterDev.totalInteractions > dev.totalInteractions,
      `interaction count 증가 (${dev.totalInteractions} → ${afterDev.totalInteractions})`);
  },
};

// ─── Runner ───

async function runExperiment(name) {
  const exp = experiments[name];
  if (!exp) {
    console.log(`❌ Unknown experiment: ${name}`);
    return;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 Experiment: ${exp.name}`);
  console.log(`📐 Hypothesis: ${exp.hypothesis}`);
  console.log(`${'─'.repeat(60)}`);

  const start = Date.now();
  try {
    await exp.run();
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`${'─'.repeat(60)}`);
  console.log(`⏱ ${elapsed}s\n`);
}

async function main() {
  const arg = process.argv[2] || 'list';

  // 헬스체크
  try {
    const h = await getHealth();
    if (!h.ok) throw new Error('Thymos not healthy');
    console.log(`🧠 Thymos: ${h.moodLabel} | stage: ${h.stage} | uptime: ${h.uptimeSec}s`);
  } catch {
    console.log('❌ Thymos daemon not reachable at port 7749');
    process.exit(1);
  }

  if (arg === 'list') {
    console.log('\n📋 Available Experiments:\n');
    for (const [key, exp] of Object.entries(experiments)) {
      console.log(`  ${key.padEnd(14)} — ${exp.name}`);
    }
    console.log(`\n  all            — 전체 실행 (시간 소요: ~5분)`);
    console.log(`\nUsage: node test/experiment.js <name|all>`);
    return;
  }

  if (arg === 'all') {
    console.log(`\n🔬 THYMOS EXPERIMENTAL PROTOCOL — FULL SUITE`);
    console.log(`   ${new Date().toISOString()}\n`);

    // 빠른 실험 먼저 (대기 없는 것)
    const fast = ['valence', 'habituation', 'mixed', 'social', 'multilingual', 'hpa_delay', 'circadian', 'development'];
    const slow = ['baseline', 'recovery'];

    console.log('── Phase 1: Fast experiments ──');
    for (const name of fast) {
      await runExperiment(name);
    }

    console.log('\n── Phase 2: Slow experiments (require wait) ──');
    for (const name of slow) {
      await runExperiment(name);
    }

    console.log('\n🏁 ALL EXPERIMENTS COMPLETE');
    return;
  }

  await runExperiment(arg);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
