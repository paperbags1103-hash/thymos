const { clamp } = require('../utils/math');

class EmotionalMemorySystem {
  constructor() {
    this.memories = [];
    this.maxMemories = 200;
    this.decayRate = 0.001;
  }

  maybeFormMemory(stimulusProfile, moodVector, predictionError, context) {
    const intensity =
      Math.abs(Number(moodVector.arousal || 0)) * 0.5 +
      Number(predictionError?.surprise || 0) * 0.3 +
      Number(stimulusProfile.intensity || 0) * 0.2;

    if (intensity < 0.5) return null;

    const ach = Number(context?.neuromodulators?.acetylcholine?.value || 0) / 100;
    if (Math.random() > intensity * (0.5 + ach * 0.5)) return null;

    const memory = {
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      context: {
        keywords: context?.keywords || [],
        author: context?.author || null,
        category: stimulusProfile.category,
      },
      emotionalTag: {
        valence: clamp(Number(moodVector.valence || 0), -1, 1),
        arousal: clamp(Number(moodVector.arousal || 0), -1, 1),
        dominance: clamp(Number(moodVector.dominance || 0), -1, 1),
        sociality: clamp(Number(moodVector.sociality || 0), -1, 1),
      },
      strength: clamp(intensity, 0, 1),
      accessCount: 0,
      lastAccessed: null,
    };

    this.memories.push(memory);
    if (this.memories.length > this.maxMemories) {
      this.memories.sort((a, b) => a.strength - b.strength);
      this.memories.shift();
    }

    return memory;
  }

  recall(currentContext) {
    const matches = [];

    for (const memory of this.memories) {
      let similarity = 0;

      const overlap = (currentContext?.keywords || []).filter((keyword) =>
        memory.context.keywords.includes(keyword)
      ).length;
      similarity += overlap * 0.3;

      if (currentContext?.author && currentContext.author === memory.context.author) {
        similarity += 0.2;
      }

      if (currentContext?.category && currentContext.category === memory.context.category) {
        similarity += 0.3;
      }

      if (similarity > 0.3) {
        matches.push({ memory, similarity });
        memory.accessCount += 1;
        memory.strength = clamp(memory.strength + 0.05, 0, 1);
        memory.lastAccessed = new Date().toISOString();
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, 3);
  }

  applyRecalledEmotions(currentVector, recalls) {
    if (!recalls || recalls.length === 0) return currentVector;

    let totalInfluence = 0;
    let vSum = 0;
    let aSum = 0;
    let dSum = 0;
    let sSum = 0;

    for (const { memory, similarity } of recalls) {
      const influence = similarity * memory.strength * 0.3;
      totalInfluence += influence;
      vSum += memory.emotionalTag.valence * influence;
      aSum += memory.emotionalTag.arousal * influence;
      dSum += memory.emotionalTag.dominance * influence;
      sSum += memory.emotionalTag.sociality * influence;
    }

    if (totalInfluence === 0) return currentVector;

    const blend = Math.min(totalInfluence, 0.4);

    return {
      valence: clamp(currentVector.valence * (1 - blend) + (vSum / totalInfluence) * blend, -1, 1),
      arousal: clamp(currentVector.arousal * (1 - blend) + (aSum / totalInfluence) * blend, -1, 1),
      dominance: clamp(currentVector.dominance * (1 - blend) + (dSum / totalInfluence) * blend, -1, 1),
      sociality: clamp(currentVector.sociality * (1 - blend) + (sSum / totalInfluence) * blend, -1, 1),
    };
  }

  decayMemories() {
    for (const memory of this.memories) {
      memory.strength *= 1 - this.decayRate;
    }

    this.memories = this.memories.filter((memory) => memory.strength > 0.05);
  }
}

module.exports = { EmotionalMemorySystem };
