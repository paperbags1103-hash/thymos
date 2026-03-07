const fs = require('fs');
const os = require('os');
const path = require('path');

const { decay, hillResponse } = require('../src/utils/math');
const { applyInteractions } = require('../src/engine/interactions');
const { getCircadianModifiers } = require('../src/engine/circadian');
const { computeMoodVector } = require('../src/feedback/mood-vector');
const { atomicWriteState } = require('../src/io/atomic-write');
const { readStateWithRecovery, createInitialState } = require('../src/io/state');

function seedRandom(seed) {
  let s = seed;
  Math.random = function random() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('Thymos core engine', () => {
  const originalRandom = Math.random;

  beforeEach(() => {
    seedRandom(42);
  });

  afterAll(() => {
    Math.random = originalRandom;
  });

  test('decay returns toward baseline', () => {
    const result = decay(90, 50, 30, 30);
    expect(result).toBeLessThan(90);
    expect(result).toBeGreaterThan(50);
  });

  test('Hill function saturates near Emax', () => {
    const low = hillResponse(10, 40, 2.5, 30);
    const high = hillResponse(100, 40, 2.5, 30);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThanOrEqual(30);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(27);
  });

  test('interaction matrix: high cortisol suppresses serotonin', () => {
    const state = createInitialState();
    state.neuromodulators.cortisol.value = 90;
    const before = state.neuromodulators.serotonin.value;

    applyInteractions(state, 60);

    expect(state.neuromodulators.serotonin.value).toBeLessThan(before);
  });

  test('atomic write creates valid JSON', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thymos-atomic-'));
    const file = path.join(tmpDir, 'state.json');
    const state = createInitialState();

    await atomicWriteState(state, file);

    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(parsed).toHaveProperty('neuromodulators');
    expect(parsed).toHaveProperty('version');
  });

  test('crash recovery applies elapsed decay', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thymos-recovery-'));
    const file = path.join(tmpDir, 'state.json');

    const state = createInitialState();
    state.neuromodulators.dopamine.value = 90;
    state.last_updated = Date.now() - 60 * 60 * 1000;

    fs.writeFileSync(file, JSON.stringify(state), 'utf8');

    const recovered = await readStateWithRecovery(file);
    expect(recovered.neuromodulators.dopamine.value).toBeLessThan(90);
    expect(recovered.neuromodulators.dopamine.value).toBeGreaterThan(50);
  });

  test('circadian differs by hour', () => {
    const morning = getCircadianModifiers(10);
    const night = getCircadianModifiers(23);
    expect(morning.dopamine).not.toBe(night.dopamine);
  });

  test('mood vector remains in [-1, 1]', () => {
    const state = createInitialState();
    state.neuromodulators.dopamine.value = 100;
    state.neuromodulators.cortisol.value = 0;
    state.neuromodulators.serotonin.value = 100;
    state.neuromodulators.oxytocin.value = 100;
    state.neuromodulators.norepinephrine.value = 100;
    state.neuromodulators.gaba.value = 0;
    state.neuromodulators.acetylcholine.value = 100;

    const vec = computeMoodVector(state.neuromodulators);

    expect(vec.valence).toBeGreaterThanOrEqual(-1);
    expect(vec.valence).toBeLessThanOrEqual(1);
    expect(vec.arousal).toBeGreaterThanOrEqual(-1);
    expect(vec.arousal).toBeLessThanOrEqual(1);
    expect(vec.dominance).toBeGreaterThanOrEqual(-1);
    expect(vec.dominance).toBeLessThanOrEqual(1);
    expect(vec.sociality).toBeGreaterThanOrEqual(-1);
    expect(vec.sociality).toBeLessThanOrEqual(1);
  });
});
