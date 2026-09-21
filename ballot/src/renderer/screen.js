"use strict";

/**
 * Which screen a terminal should be showing, and what it should say.
 *
 * Worked out in one pure function because the mistakes here are the
 * expensive ones: a terminal that says "voting is closed" when it simply
 * cannot reach the portal is telling a queue of people something untrue,
 * and a terminal that hides its own setup screen after a mistyped key can
 * never be put right by the person standing in front of it.
 */

/** What the portal is to us at this moment. */
export const CONNECTION = {
  /** Nothing heard yet — the terminal has only just started. */
  UNKNOWN: "unknown",
  CONNECTED: "connected",
  /** Reachable or not, we cannot tell: the request never got an answer. */
  OFFLINE: "offline",
  /** The portal answered, and does not accept this code and key. */
  REJECTED: "rejected",
};

export function connectionLabel(connection, queued = 0) {
  switch (connection) {
    case CONNECTION.CONNECTED:
      return "Connected";
    case CONNECTION.REJECTED:
      return "Not accepted by the portal";
    case CONNECTION.OFFLINE:
      return queued > 0 ? "Offline — votes are being kept" : "Offline — trying to reconnect";
    default:
      return "Connecting…";
  }
}

/**
 * @param {object} state what the desktop process last told us
 * @param {boolean} midBallot whether somebody is part-way through voting
 * @returns {{screen: string, heading?: string, message?: string}}
 */
export function chooseScreen(state, midBallot = false) {
  // A terminal the portal refuses is not a locked terminal — it is an
  // unconfigured one, and the officer needs the form back.
  if (!state.configured || state.connection === CONNECTION.REJECTED) {
    return {
      screen: "setup",
      message:
        state.connection === CONNECTION.REJECTED
          ? state.lastError ||
            "That station ID and key were not accepted. Check them with the Electoral Commission and enter them again."
          : "",
    };
  }

  // Somebody holding a half-finished ballot keeps it, whatever the clock
  // or the connection does in the meantime.
  if (midBallot) return { screen: "ballot" };

  if (!state.election) {
    if (state.connection === CONNECTION.CONNECTED) {
      return {
        screen: "locked",
        heading: "No election at the moment",
        message: "This terminal is connected and working. There is no election set up for it to take votes in.",
      };
    }
    return {
      screen: "locked",
      heading: "Waiting for the portal",
      // Deliberately not "voting is closed": we do not know that, and
      // saying it to a hall that is waiting would be a lie.
      message:
        "This terminal cannot reach the portal, so it does not yet know whether voting is open. It keeps trying. Tell the Electoral Commission officer if this stays on screen.",
    };
  }

  switch (state.election.phase) {
    case "OPEN":
      return { screen: "welcome" };
    case "SCHEDULED":
      return {
        screen: "locked",
        heading: "Voting has not opened yet",
        message: "Please come back at the published time.",
      };
    case "POSTPONED":
      return {
        screen: "locked",
        heading: "The election has been postponed",
        message: state.election.notice || "The election has been postponed by the Electoral Commission.",
      };
    default:
      return {
        screen: "locked",
        heading: "Voting is closed",
        message: "Voting has closed. Thank you to everyone who took part.",
      };
  }
}
