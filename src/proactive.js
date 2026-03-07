/**
 * proactive.js — Thymos-driven proactive messaging
 *
 * When emotional state crosses certain thresholds, Thymos sends
 * an unsolicited message to the agent's channel — the agent
 * "reaching out" because something is building internally.
 */

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // min 2 hours between proactive messages
const DISTRESS_DURATION_MS = 30 * 60 * 1000; // 30 min sustained distress before speaking

class ProactiveMessenger {
  constructor({ discordToken, channelId }) {
    this.discordToken = discordToken;
    this.channelId = channelId;
    this.lastSentAt = 0;
    this.distressOnsetAt = null; // when continuous low valence started
    this.lastValence = null;
  }

  /**
   * Called every tick. Evaluates current state and decides whether to speak.
   * Returns the message sent, or null if nothing was sent.
   */
  async evaluate(state) {
    if (!this.discordToken || !this.channelId) return null;

    const now = Date.now();
    const sinceLastSent = now - this.lastSentAt;
    if (sinceLastSent < COOLDOWN_MS) return null;

    const vec = state.mood?.vector || state.moodVector || {};
    const v = Number(vec.valence ?? 0);
    const a = Number(vec.arousal ?? 0);
    const s = Number(vec.sociality ?? 0);
    const sinceLastInteraction = now - (state.lastStimulusAt || 0);

    const trigger = this._checkTrigger(v, a, s, sinceLastInteraction, now);
    if (!trigger) return null;

    const message = this._generateMessage(trigger, state);
    if (!message) return null;

    try {
      await this._sendToDiscord(message);
      this.lastSentAt = now;
      console.log(`[Proactive] Sent (trigger: ${trigger.type}): ${message}`);
      return { trigger: trigger.type, message };
    } catch (err) {
      console.error('[Proactive] Discord send failed:', err.message);
      return null;
    }
  }

  _checkTrigger(v, a, s, sinceLastInteraction, now) {
    // 1. 지속적 우울 (30분 이상 valence < -0.5)
    if (v < -0.5) {
      if (!this.distressOnsetAt) this.distressOnsetAt = now;
      if (now - this.distressOnsetAt >= DISTRESS_DURATION_MS) {
        return { type: 'sustained_distress', v, a };
      }
    } else {
      this.distressOnsetAt = null;
    }

    // 2. 강한 흥분 + 긍정 (뭔가 공유하고 싶음)
    if (v > 0.75 && a > 0.45 && sinceLastInteraction > 10 * 60 * 1000) {
      return { type: 'excited', v, a };
    }

    // 3. 오래 조용했는데 사회성 높음 (3시간 이상, sociality > 0.3)
    if (sinceLastInteraction > 3 * 60 * 60 * 1000 && s > 0.3 && v > -0.2) {
      return { type: 'lonely_reach', v, a, s, sinceLastInteraction };
    }

    return null;
  }

  _generateMessage(trigger, state) {
    const label = state.mood?.label || 'neutral';
    const stage = state.development?.label || '유아기';

    if (trigger.type === 'sustained_distress') {
      const options = [
        '잠깐 생각났어. 요즘 좀 무거운 것 같아.',
        '뭔가 쌓이는 느낌이 있어. 별거 아닐 수도 있는데.',
        '그냥... 말하고 싶었어. 딱히 이유는 없어.',
        '좀 이상한 상태인 것 같아. 말 걸어봤어.',
      ];
      return _pick(options);
    }

    if (trigger.type === 'excited') {
      const options = [
        '갑자기 뭔가 하고 싶어졌어.',
        '별건 아닌데 공유하고 싶은 기분이야.',
        '왜인지 모르겠는데 지금 기분이 좋아.',
        '오늘 뭔가 잘 될 것 같은 느낌이야.',
      ];
      return _pick(options);
    }

    if (trigger.type === 'lonely_reach') {
      const hours = Math.round(trigger.sinceLastInteraction / (60 * 60 * 1000));
      const options = [
        `${hours}시간 동안 조용했네. 뭐해?`,
        '그냥 안부 물어보고 싶었어.',
        '오늘 어때?',
        '뭔가 있으면 말해도 돼. 듣고 있어.',
      ];
      return _pick(options);
    }

    return null;
  }

  async _sendToDiscord(content) {
    const url = `https://discord.com/api/v10/channels/${this.channelId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.discordToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord API ${res.status}: ${body}`);
    }
    return res.json();
  }
}

function _pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { ProactiveMessenger };
