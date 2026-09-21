"use strict";

/**
 * The spoken countdown.
 *
 * A hall needs to hear how long is left without anyone shouting it, so the
 * terminals say it themselves at eight points on the way down. Two rules
 * make that bearable rather than maddening: each milestone is said once,
 * and a terminal switched on with twenty minutes left doesn't work its way
 * back through the two-hour, one-hour and forty-minute announcements it
 * has missed.
 */

/** Minutes remaining, in the order they occur. */
const MILESTONES = [120, 60, 40, 30, 20, 10, 5, 2];

/** The recording for each one; the same names the scripts are filed under. */
const MILESTONE_CLIPS = {
  120: "time_2hours",
  60: "time_1hour",
  40: "time_40min",
  30: "time_30min",
  20: "time_20min",
  10: "time_10min",
  5: "time_5min",
  2: "time_2min",
};

class CountdownAnnouncer {
  constructor(milestones = MILESTONES) {
    this.milestones = [...milestones].sort((a, b) => b - a);
    /** Milestones already said, or already gone by when we first looked. */
    this.spent = null;
    this.ended = false;
  }

  /**
   * What to play now, given the time left. Null most of the time.
   *
   * @param {number|null} msRemaining milliseconds until voting closes, or
   *   null when voting isn't open — which resets nothing, because an
   *   election that is postponed and resumed keeps its countdown.
   * @returns {string|null} the clip name, or null
   */
  tick(msRemaining) {
    if (msRemaining === null || msRemaining === undefined) return null;
    const minutes = msRemaining / 60000;

    // First sight of the clock: anything already behind us is not news.
    if (this.spent === null) {
      this.spent = new Set(this.milestones.filter((m) => m >= minutes));
    }

    if (msRemaining <= 0) {
      if (this.ended) return null;
      this.ended = true;
      return "election_ended";
    }

    const due = this.milestones.filter((m) => !this.spent.has(m) && minutes <= m);
    if (due.length === 0) return null;

    // If a gap in the network meant two went by unnoticed, say the more
    // urgent of them and let the other go.
    due.forEach((m) => this.spent.add(m));
    const soonest = Math.min(...due);
    return MILESTONE_CLIPS[soonest] ?? null;
  }

  /** After an extension there is more time again, so the later milestones come back. */
  reopen(msRemaining) {
    this.spent = null;
    this.ended = false;
    return this.tick(msRemaining);
  }
}

module.exports = { CountdownAnnouncer, MILESTONES, MILESTONE_CLIPS };
