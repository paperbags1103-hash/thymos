const fs = require('fs');
const config = require('../utils/config');
const { clamp } = require('../utils/math');

class RelationshipMemory {
  constructor(filePath = config.paths.relationshipsFile) {
    this.filePath = filePath;
    this.relationships = {};
    this._load();
  }

  updateRelationship(authorId, stimulusProfile) {
    if (!authorId) return null;

    const id = String(authorId);
    if (!this.relationships[id]) {
      this.relationships[id] = {
        trust_level: 0.5,
        interaction_count: 0,
        positive_count: 0,
        positive_ratio: 0.5,
        baseline_bonuses: { oxytocin: 0, serotonin: 0, dopamine: 0 },
        last_positive: null,
        last_negative: null,
      };
    }

    const relation = this.relationships[id];
    relation.interaction_count += 1;

    const valence = Number(stimulusProfile?.valence || 0);
    if (valence > 0.2) {
      relation.positive_count += 1;
      relation.last_positive = new Date().toISOString();
    } else if (valence < -0.2) {
      relation.last_negative = new Date().toISOString();
    }

    relation.positive_ratio = relation.positive_count / Math.max(1, relation.interaction_count);

    relation.trust_level = clamp(
      relation.trust_level * 0.9 + relation.positive_ratio * 0.1,
      0,
      1
    );

    relation.baseline_bonuses = {
      oxytocin: Math.round(relation.trust_level * 10),
      serotonin: Math.round(relation.positive_ratio * 7),
      dopamine: Math.round(relation.positive_ratio * 4),
    };

    this._persist();
    return relation;
  }

  getBaselineBonuses(authorId) {
    if (!authorId) return { oxytocin: 0, serotonin: 0, dopamine: 0 };
    const relation = this.relationships[String(authorId)];
    if (!relation) return { oxytocin: 0, serotonin: 0, dopamine: 0 };
    return { ...relation.baseline_bonuses };
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.relationships = parsed.relationships || {};
    } catch {
      this.relationships = {};
    }
  }

  _persist() {
    const payload = JSON.stringify({ relationships: this.relationships }, null, 2);
    fs.writeFileSync(this.filePath, payload, 'utf8');
  }
}

module.exports = { RelationshipMemory };
