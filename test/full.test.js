const fs = require('fs');
const os = require('os');
const path = require('path');

const config = require('../src/utils/config');
const { createInitialState } = require('../src/io/state');
const { StimulusClassifier, stimulusToNeuromodulators } = require('../src/cognition/classifier');
const { PredictionEngine } = require('../src/cognition/prediction');
const { attentionGate } = require('../src/cognition/attention');
const { InternalAgents } = require('../src/agents/internal');
const { globalWorkspaceCompetition } = require('../src/agents/gwt');
const { DevelopmentStage } = require('../src/social/development');
const { EmotionalMemorySystem } = require('../src/memory/emotional');
const { SelfFeedbackLoop } = require('../src/feedback/self-loop');
const { MetacognitionLayer } = require('../src/cognition/metacognition');
const { ThymosDaemon } = require('../src/daemon');

function seedRandom(seed = 42) {
  let s = seed;
  Math.random = function random() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('Thymos full build', () => {
  const originalRandom = Math.random;
  const originalStateFile = config.paths.stateFile;
  const originalRelationshipsFile = config.paths.relationshipsFile;

  beforeEach(() => {
    seedRandom(7);
  });

  afterAll(() => {
    Math.random = originalRandom;
    config.paths.stateFile = originalStateFile;
    config.paths.relationshipsFile = originalRelationshipsFile;
  });

  test('classifier categorizes praise/criticism/humor', () => {
    const classifier = new StimulusClassifier();

    const praise = classifier.classify({ type: 'message', content: '정말 잘했어 최고야 칭찬해' });
    const criticism = classifier.classify({ type: 'message', content: '이건 비판이고 별로야 실망이야' });
    const humor = classifier.classify({ type: 'message', content: 'ㅋㅋㅋ 이거 너무 웃기다' });

    expect(praise.category).toBe('praise');
    expect(criticism.category).toBe('criticism');
    expect(humor.category).toBe('humor');
  });

  test('prediction engine computes Shannon surprise and updates priors', () => {
    const engine = new PredictionEngine();
    const before = engine.priors.praise;

    const result = engine.processStimulusAndGetError({ category: 'praise', valence: 0.8 });

    expect(result.surprise).toBeGreaterThan(1.7);
    expect(result.predicted).toBeCloseTo(before, 6);
    expect(engine.priors.praise).toBeGreaterThan(before);
  });

  test('attention gate amplifies negative stimuli when mood valence is negative', () => {
    const gated = attentionGate(
      { valence: -0.6, arousal: 0.4, intensity: 0.5, category: 'criticism' },
      { valence: -0.8, arousal: 0.2 }
    );

    expect(gated.intensity).toBeGreaterThan(0.5);
    expect(gated.amplification).toBeGreaterThan(1);
  });

  test('GWT competition picks highest weighted activation winner', () => {
    const dev = new DevelopmentStage({ createdAt: Date.now(), totalInteractions: 0 });
    const agents = new InternalAgents();

    const nm = createInitialState().neuromodulators;
    nm.dopamine.value = 95;
    nm.norepinephrine.value = 90;
    nm.serotonin.value = 20;
    nm.gaba.value = 20;

    const id = agents.generateIdResponse(nm, null);
    const ego = agents.generateEgoResponse(nm, null, {});
    const sup = agents.generateSuperegoResponse(nm, null);

    const broadcast = globalWorkspaceCompetition(id, ego, sup, dev);
    expect(broadcast.primary.agent).toBe('id');
  });

  test('development stages progress with time + interactions', () => {
    const now = Date.now();
    const stageInfant = new DevelopmentStage({ createdAt: now, totalInteractions: 10 });
    const stageChild = new DevelopmentStage({ createdAt: now - 5 * 24 * 60 * 60 * 1000, totalInteractions: 100 });
    const stageAdult = new DevelopmentStage({ createdAt: now - 100 * 24 * 60 * 60 * 1000, totalInteractions: 3000 });

    expect(stageInfant.getStage().name).toBe('infant');
    expect(stageChild.getStage().name).toBe('child');
    expect(stageAdult.getStage().name).toBe('adult');
  });

  test('emotional memory forms on high-intensity events', () => {
    const memory = new EmotionalMemorySystem();

    const formed = memory.maybeFormMemory(
      { category: 'error', intensity: 1, valence: -0.9, arousal: 0.9 },
      { valence: -0.8, arousal: 0.95, dominance: -0.7, sociality: -0.3 },
      { surprise: 4.5 },
      { neuromodulators: { acetylcholine: { value: 100 } }, author: 'ab', keywords: ['error'] }
    );

    expect(formed).not.toBeNull();
    expect(memory.memories.length).toBe(1);
  });

  test('self-feedback loop attenuates neuromod deltas by 0.3', () => {
    const classifier = new StimulusClassifier();
    const loop = new SelfFeedbackLoop(classifier);

    const baseProfile = classifier.fallbackKeywordClassify('잘했어 최고야');
    const base = stimulusToNeuromodulators(baseProfile);
    const attenuated = loop.processSelfOutput('잘했어 최고야');

    expect(attenuated.dopamine).toBeCloseTo(base.dopamine * 0.3, 3);
  });

  test('metacognition dampens extreme values', () => {
    const dev = new DevelopmentStage({
      createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
      totalInteractions: 3000,
    });
    const metacog = new MetacognitionLayer(dev);

    const result = metacog.regulate(
      { valence: -0.95, arousal: 0.92, dominance: 0.1, sociality: -0.1 },
      { conflict: 0.9 },
      { inConversation: true, isGenuineThreat: false }
    );

    expect(result.regulated.valence).toBeGreaterThan(-0.95);
    expect(result.regulated.arousal).toBeLessThan(0.92);
  });

  test('full pipeline: praise x3 then criticism x1 does not crash mood', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thymos-full-'));
    config.paths.stateFile = path.join(tmpDir, 'state.json');
    config.paths.relationshipsFile = path.join(tmpDir, 'relationships.json');

    const daemon = new ThymosDaemon();
    daemon.state = createInitialState();
    daemon._initSubsystems();
    await daemon.tick();

    for (let i = 0; i < 3; i += 1) {
      await daemon.processStimulus({ type: 'message', author: 'ab', content: '잘했어 최고야 칭찬해' });
    }

    const before = daemon.state.moodVector.valence;
    await daemon.processStimulus({ type: 'message', author: 'ab', content: '이건 비판이야 별로야' });
    const after = daemon.state.moodVector.valence;

    expect(before).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(-0.6);
  });
});
