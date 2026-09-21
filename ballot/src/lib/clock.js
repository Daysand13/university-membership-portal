"use strict";

/**
 * The time the portal keeps, not the time this machine thinks it is.
 *
 * Workstations in a hall are as likely as not to have a clock an hour out,
 * and a terminal that closed an hour early because of it would be a
 * scandal. Every answer from the portal carries the server's own time, so
 * the difference is measured once and the countdown runs from that.
 */
class ServerClock {
  constructor() {
    this.offsetMs = 0;
    this.synced = false;
  }

  sync(serverTimeIso) {
    const server = Date.parse(serverTimeIso);
    if (Number.isNaN(server)) return;
    this.offsetMs = server - Date.now();
    this.synced = true;
  }

  now() {
    return Date.now() + this.offsetMs;
  }

  /** Milliseconds from now until an ISO timestamp, or null if there isn't one. */
  msUntil(iso) {
    if (!iso) return null;
    const at = Date.parse(iso);
    if (Number.isNaN(at)) return null;
    return at - this.now();
  }
}

module.exports = { ServerClock };
