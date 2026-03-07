# Thymos Phase 1: Core Engine

Read ARCHITECTURE.md first — it has all the detailed specs, code snippets, and algorithms.

## Goal
Build the core Thymos daemon that runs via pm2, maintains 7 neuromodulator values with decay, interaction matrix, circadian rhythm, and writes emotional_state.json atomically every 30 seconds.

## What to Build (Phase 1 ONLY)

### 1. `package.json`
- name: thymos
- version: 0.1.0
- main: src/daemon.js
- dependencies: express
- scripts: start, test (jest)

### 2. `src/utils/math.js`
- `clamp(val, min, max)`
- `hillResponse(stimulus, EC50, n, Emax)` — sigmoidal dose-response (see ARCHITECTURE.md §2.2)
- `decay(currentValue, baseline, tau, elapsedMin)` — exponential decay
- `gaussianNoise(mean, stddev)` — Box-Muller transform
- `addNoise(delta, noiseFraction)` — add gaussian noise to delta
- `avg(arr)`, `stddev(arr)`

### 3. `src/utils/config.js`
- Load config/defaults.json
- Export neuromodulator configs, tick interval, ports, file paths

### 4. `config/defaults.json`
- Copy exactly from ARCHITECTURE.md §19.3

### 5. `src/engine/neuromodulators.js`
- `applyStimulus(state, neuromodName, rawDelta)` — Hill function + cortisol HPA delay (pending queue)
- `processPendingCortisol(state)` — activate delayed cortisol
- `decayAll(state, elapsedMin, effectiveBaselines)` — decay all toward baselines
- `getEffectiveBaseline(config, circadianMod, relationshipBonus, retrospectionMod)`

### 6. `src/engine/interactions.js`
- `INTERACTION_MATRIX` — copy from ARCHITECTURE.md §3.2
- `applyInteractions(state, tickIntervalSec)` — simultaneous application (§3.3)

### 7. `src/engine/circadian.js`
- `getCircadianModifiers(hour)` — returns per-neuromodulator adjustments (§16.1)

### 8. `src/engine/noise.js`
- `addNoiseDevelopmental(delta, volatility)` — noise scaled by dev stage

### 9. `src/feedback/mood-vector.js`
- `computeMoodVector(neuromodulators)` — 7 neuromod → 4D vector (§5.2)
- `vectorToLabel(vec)` — nearest prototype label with confidence (§5.4)
- `EmotionalMomentum` class — EMA with momentum tracking (§5.3)

### 10. `src/io/atomic-write.js`
- `atomicWriteState(state, filePath)` — tmp + rename (§18.1)

### 11. `src/io/state.js`
- `readStateWithRecovery(filePath)` — read + crash recovery with elapsed decay (§18.1)
- `createInitialState()` — fresh state (§18.2)

### 12. `src/io/prompt.js`
- `generatePromptInjection(state)` — create the text string for LLM injection
- Format: `[Thymos State]\nMood: label (V:±x.xx A:±x.xx D:±x.xx S:±x.xx)\nDrive: ...`

### 13. `src/daemon.js`
- ThymosDaemon class with:
  - `start()` — load state, start tick interval (30s), start Express on port 7749
  - `tick()` — the main loop: pending cortisol → circadian → decay → interactions → mood vector → momentum → label → write state
  - Express routes: `GET /health`, `GET /state`, `GET /prompt`, `POST /webhook/stimulus` (basic: just apply raw deltas for now, full classifier comes in Phase 2)
- For POST /webhook/stimulus, accept: `{ type, subtype, author, content }` and apply basic rule-based classification (praise→DA+/OXT+, criticism→CORT+/5HT-, error→CORT+/NE+, neutral→5HT+2)

### 14. `ecosystem.config.js`
- pm2 config for thymos daemon

### 15. Tests: `test/core.test.js`
- Test decay returns toward baseline
- Test Hill function saturation
- Test interaction matrix (high cortisol suppresses serotonin)
- Test atomic write creates valid JSON
- Test crash recovery applies elapsed decay
- Test circadian returns different values for different hours
- Test mood vector computation produces valid [-1,1] range

## Rules
- Use CommonJS (require/module.exports), NOT ES modules
- All neuromodulator values must be clamped [0, 100]
- All mood vector dimensions must be clamped [-1, 1]
- Noise must use seeded random in tests (override Math.random)
- DO NOT implement Phase 2+ features (classifier LLM, prediction engine, GWT, metacognition, memory, social model, development stages). Just stub them if needed.
- Keep it simple and working. We can add complexity later.

When completely finished, run this command to notify me:
openclaw system event --text "Done: Thymos Phase 1 core engine complete" --mode now
