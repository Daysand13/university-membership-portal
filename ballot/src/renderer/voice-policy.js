"use strict";

/**
 * What may be said on the hall speaker, and when the voter's own voice may
 * speak at all.
 *
 * ASSN Ballot talks in two voices, and the whole point of this file is that
 * they can never be confused:
 *
 *  - THE PUBLIC VOICE, on the external speaker the hall hears. It says only
 *    general status — "Member verification successful", "Voting is
 *    currently closed". It takes a KEY from the list below, never text, so
 *    there is no way to hand it a candidate's name, a voter's choice or a
 *    voter's name: no code path exists that could, by mistake or otherwise.
 *
 *  - THE PRIVATE VOICE, for the voter: candidates' names, what they have
 *    chosen, their ballot read back. It speaks on the computer's default
 *    output, which the officers set to the voter's headphones — the same
 *    place the voter's own screen reader speaks.
 *
 * A browser's speech engine cannot be pointed at a particular speaker; it
 * always uses the default. So if the default output IS the hall speaker,
 * private speech would be heard by the hall. That case is detected (see
 * privateVoiceAllowed) and private speech is then switched off entirely,
 * with the officer told why. The ballot is still on screen for the voter's
 * own screen reader, which they control.
 *
 * Plain functions, no DOM, so every rule is tested.
 */

/**
 * Everything the public voice can ever say. Short, general, and true of
 * anybody — none names a person, a candidate or a choice.
 */
export const PUBLIC_ANNOUNCEMENTS = Object.freeze({
  welcome: "Welcome to ASSN Ballot. Please enter your index number to begin.",
  complete_verification: "Please complete member verification.",
  member_verified: "Member verification successful.",
  eligible: "You are eligible to vote.",
  voter_denied: "Access denied. This index number is not on the register.",
  already_voted: "Access denied. Your vote has already been cast.",
  // Deliberately not "your dues are unpaid": that is a person's own
  // business, and the hall can see who is standing at the terminal.
  contact_officer: "Access denied. Please contact the election officer for assistance.",
  assistance: "Please contact the election officer for assistance.",
  vote_confirmed: "Your vote has been recorded successfully. Thank you for voting.",
  election_closed: "Voting is currently closed.",
  election_postponed: "Notice: the election has been postponed by the Electoral Commission.",
  election_ended: "Voting has officially ended. Thank you for your participation.",
  time_2hours: "Attention: two hours remaining until voting closes.",
  time_1hour: "Attention: one hour remaining until voting closes.",
  time_40min: "Attention: forty minutes remaining until voting closes.",
  time_30min: "Attention: thirty minutes remaining until voting closes.",
  time_20min: "Attention: twenty minutes remaining until voting closes.",
  time_10min: "Attention: ten minutes remaining until voting closes.",
  time_5min: "Attention: five minutes remaining until voting closes.",
  time_2min: "Attention: two minutes remaining until voting closes. Please complete your ballot.",
  test: "This is a test of the ASSN Ballot announcement speaker.",
});

export const PUBLIC_KEYS = Object.freeze(Object.keys(PUBLIC_ANNOUNCEMENTS));

/** The words for a key, or null for anything that is not one of them. */
export function publicScript(key) {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_ANNOUNCEMENTS, key)
    ? PUBLIC_ANNOUNCEMENTS[key]
    : null;
}

/**
 * What the hall hears after an index number is checked. Nothing that ties
 * the person standing there to anything about them beyond whether they may
 * vote.
 */
export function announcementForCheckIn(status) {
  switch (status) {
    case "VERIFIED":
      return "member_verified";
    case "INVALID_INDEX":
      return "voter_denied";
    case "ALREADY_VOTED":
      return "already_voted";
    case "VOTING_CLOSED":
      return "election_closed";
    case "DUES_UNPAID":
      return "contact_officer";
    default:
      // Offline, an error, anything unexpected: a person to help, not a
      // reason to broadcast.
      return "assistance";
  }
}

/**
 * Whether the voter's private voice may speak.
 *
 * Two conditions, and the first is a person's, not the machine's:
 *
 *  1. An officer has confirmed that Windows' default sound output on this
 *     terminal is the voter's headphones. The terminal cannot know that by
 *     itself — a speaker and a pair of headphones look alike to it — and
 *     guessing wrong would broadcast somebody's vote. So until somebody who
 *     can see the cables says so, the private voice is off.
 *  2. Nothing contradicts that. Browsers list the system default output as
 *     its own entry ("default"), sharing a groupId with the real device
 *     behind it; if the chosen hall speaker turns out to BE the default, the
 *     confirmation is wrong and the private voice stays off regardless.
 *
 * @param {object} params
 * @param {Array<{deviceId:string, groupId:string, label:string}>} params.outputs audio outputs, from enumerateDevices
 * @param {string|null} params.publicDeviceId the hall speaker chosen in the officer controls
 * @param {boolean} params.announcementsOn whether the public voice is on at all
 * @param {boolean} params.defaultIsHeadphones an officer's confirmation of (1)
 * @returns {{allowed: boolean, reason: string}}
 */
export function privateVoiceAllowed({ outputs, publicDeviceId, announcementsOn, defaultIsHeadphones }) {
  if (!defaultIsHeadphones) {
    return {
      allowed: false,
      reason:
        "The voter's spoken ballot is off: nobody has confirmed that Windows' default sound output is the voter's headphones. An officer can confirm it in the officer controls. The ballot is still on screen for a screen reader.",
    };
  }

  const hall = publicDeviceId && publicDeviceId !== "default" ? outputs.find((o) => o.deviceId === publicDeviceId) : null;
  const systemDefault = outputs.find((o) => o.deviceId === "default");

  if (announcementsOn && publicDeviceId && publicDeviceId !== "default" && !hall) {
    return {
      allowed: false,
      reason:
        "The chosen hall speaker is not connected, so it cannot be told apart from the headphones. The voter's spoken ballot is off until it is reconnected or another speaker is chosen.",
    };
  }
  if (hall && systemDefault && systemDefault.groupId && systemDefault.groupId === hall.groupId) {
    return {
      allowed: false,
      reason:
        "The hall speaker is also Windows' default sound output, so the voter's spoken ballot would be heard by the hall. It is off. Set Windows' default sound output to the voter's headphones.",
    };
  }
  return {
    allowed: true,
    reason: announcementsOn && hall
      ? "Announcements go to the hall speaker. The voter's spoken ballot goes to their headphones."
      : "The voter's spoken ballot goes to their headphones. No hall speaker is in use, so announcements play there too.",
  };
}

/** Officer-facing name for an output, for lists and the status line. */
export function outputName(outputs, deviceId) {
  if (!deviceId || deviceId === "default") return "Windows' default output";
  return outputs.find((o) => o.deviceId === deviceId)?.label || "A speaker that is not connected";
}
