# Thymos Phase 2+3+4: Full Build

Phase 1 is DONE and running (7 neuromodulators, decay, interactions, circadian, mood vector, atomic write, pm2 daemon on port 7749). All code is in src/.

Read ARCHITECTURE.md — it has ALL the code snippets and algorithms. Follow them closely.

## Phase 2: Cognition System

### 1. `src/cognition/classifier.js`
- `StimulusClassifier` class (ARCHITECTURE.md §4)
- `classify(stimulus)` — hybrid: rule-based for system events, keyword fallback for messages
- `classifyByRule(stimulus)` — map system subtypes to {valence, arousal, category, intensity, social_signal}
- `fallbackKeywordClassify(text)` — Korean keyword regex (칭찬/비판/유머 etc)
- NO LLM calls yet (just rules + keywords for now, LLM can be added later)
- Export `stimulusToNeuromodulators(profile)` function (§4.2) — convert classified profile to neuromod deltas

### 2. `src/cognition/prediction.js`
- `PredictionEngine` class (§6.2)
- `processStimulusAndGetError(stimulusProfile)` — Shannon surprise + signed surprise + prior update
- `predictionErrorToNeuromod(predError)` — surprise → neuromod deltas
- Maintains prior distribution over categories, updates via exponential moving average

### 3. `src/cognition/attention.js`
- `attentionGate(stimulusProfile, currentMoodVector)` — mood-congruent bias + arousal gate (§7.2)

### 4. `src/cognition/metacognition.js`
- `MetacognitionLayer` class (§12.2)
- `regulate(moodVector, broadcast, context)` — extreme damping, conflict calming, cognitive reappraisal, social regulation
- Uses development stage's regulationCapacity
- Returns `{ original, regulated, appliedRegulations, regulationCapacity, selfAwareness }`

### 5. `src/cognition/retrospection.js`
- `RetrospectionEngine` class (§11.2)
- `logState(moodVector, label)`, `shouldRetrospect()`, `retrospect()`
- 2-hour interval, trajectory analysis, trend detection

## Phase 3: Consciousness Layer

### 6. `src/agents/internal.js`
- `InternalAgents` class (§8.2)
- `generateIdResponse(neuromodulators, stimulus)` — dopamine+NE driven
- `generateEgoResponse(neuromodulators, stimulus, context)` — balance-based
- `generateSuperegoResponse(neuromodulators, stimulus)` — serotonin+GABA+OXT driven

### 7. `src/agents/gwt.js`
- `globalWorkspaceCompetition(idResp, egoResp, superegoResp, devStage)` — weighted activation competition (§8.3)
- Returns broadcast with primary/secondary/tertiary + conflict level

### 8. `src/feedback/self-loop.js`
- `SelfFeedbackLoop` class (§10.2)
- `processSelfOutput(llmOutput)` — classify own output, attenuate by 0.3, return deltas

## Phase 4: Memory + Social + Development

### 9. `src/memory/emotional.js`
- `EmotionalMemorySystem` class (§9.3)
- `maybeFormMemory(stimulusProfile, moodVector, predictionError, context)` — ACh-dependent formation
- `recall(currentContext)` — keyword/author/category similarity search
- `applyRecalledEmotions(currentVector, recalls)` — blend recalled emotions
- `decayMemories()` — tick-based decay, prune weak memories

### 10. `src/memory/somatic.js`
- `SomaticMarkerSystem` class (§13.2)
- `recordOutcome(decision, outcome)`, `getGutFeeling(proposedDecision)`

### 11. `src/memory/relationships.js`
- `RelationshipMemory` class
- `updateRelationship(authorId, stimulusProfile)` — track trust, interaction count, positive ratio
- `getBaselineBonuses(authorId)` — return oxytocin/serotonin/dopamine bonuses
- Persist to data/relationships.json

### 12. `src/social/model.js`
- `SocialModel` class (§14.2)
- `updateModel(authorId, stimulusProfile)`, `getEstimatedState(authorId)`, `toPromptText(authorId)`

### 13. `src/social/development.js`
- `DevelopmentStage` class (§15.2)
- `getStage()` — infant/child/adolescent/adult based on days + interactions
- `getRegulationCapacity()`, `getVolatility()`, `getAgentWeights()`

## Integration: Update daemon.js

### 14. Update `src/daemon.js`
The current daemon has a basic tick() and basic /webhook/stimulus. Replace with the FULL pipeline:

**tick() must now:**
1. Process pending cortisol
2. Get circadian modifiers
3. Decay all neuromodulators
4. Apply interaction matrix
5. Compute raw mood vector
6. Apply momentum
7. Run GWT competition (id/ego/superego)
8. Run metacognition regulation
9. Compute mood label
10. Log to retrospection + check if should retrospect
11. Decay emotional memories
12. Update state with all new fields (gwt, metacognition, development, circadian, prediction)
13. Generate prompt injection (FULL version with GWT drive, development stage, social model)
14. Atomic write

**processStimulus(stimulus) must now:**
1. Classify stimulus (hybrid classifier)
2. Apply attention gate
3. Compute prediction error
4. Get development volatility
5. Convert stimulus → neuromod deltas
6. Add prediction error deltas
7. Merge + noise + apply
8. Recall emotional memories → blend
9. Maybe form new emotional memory
10. Update social model
11. Update relationship memory
12. Increment development interactions
13. Trigger immediate tick
14. Return full result

**New routes:**
- `POST /webhook/self-feedback` — self-loop processing
- `POST /gut-feeling` — somatic marker query
- `POST /decision-outcome` — record decision result
- `GET /health` — include stage, mood label, uptime

### 15. Update `src/io/prompt.js`
Full prompt injection with:
- Mood vector + label
- GWT primary drive + secondary voice + conflict
- Development stage
- Metacognition self-awareness (if any)
- Social model text (if confidence > 0.3)
- Prediction uncertainty

### 16. Update tests: `test/full.test.js`
- Test classifier categorizes praise/criticism/humor correctly
- Test prediction engine surprise calculation
- Test attention gate amplifies negative stimuli when valence is negative
- Test GWT competition returns winner with highest weighted activation
- Test development stages progress with time + interactions
- Test emotional memory forms on high-intensity events
- Test self-feedback loop attenuates by 0.3
- Test metacognition dampens extreme values
- Test full pipeline: praise x3 → criticism x1 → mood doesn't crash

## Rules
- CommonJS (require/module.exports)
- All values clamped (neuromod [0,100], vector [-1,1])
- DO NOT break existing Phase 1 code that works
- DO NOT change config/defaults.json structure (you can add new fields)
- Keep the basic /webhook/stimulus backward compatible (still accepts {type, subtype, author, content})
- Make sure `npm test` passes ALL tests (old + new)
- After everything is done, restart the daemon: kill the old node process on port 7749 and start fresh with `node src/daemon.js` to verify it boots

When completely finished, run:
openclaw system event --text "Done: Thymos Phase 2-3-4 complete — full consciousness engine" --mode now
