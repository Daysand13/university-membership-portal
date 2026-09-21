"use strict";

/**
 * Everything the terminal says out loud.
 *
 * Two kinds of speech, deliberately kept apart. The fixed announcements
 * are recordings, because a hall wants a steady human voice saying the
 * same words every time. Candidates' names and portfolios are not: they
 * come from the database and change with every election, so they are
 * spoken by the machine and, more importantly, written in a page a screen
 * reader can read properly.
 *
 * Where a recording hasn't been made yet, the script for it is spoken
 * instead, so the terminal is never silent about something it was
 * supposed to say.
 */

const SCRIPTS = {
  welcome: "Welcome to ASSN Ballot. Please enter your index number to begin.",
  member_verified: "Member verified successfully. Welcome to ASSN Ballot.",
  voter_denied: "Access denied. Your index number is not registered in the ASSN database.",
  dues_unpaid: "Access denied. Dues payment is required to participate in this election.",
  already_voted: "Access denied. You have already cast your vote for this election.",
  vote_confirmed: "Thank you for voting. Your vote has been recorded successfully.",
  election_closed: "Access denied. Voting is currently closed.",
  election_postponed: "Notice: The election has been postponed by the Electoral Commission.",
  election_ended: "Voting has officially ended. Thank you for your participation.",
  time_2hours: "Attention: Two hours remaining until voting closes.",
  time_1hour: "Attention: One hour remaining until voting closes.",
  time_40min: "Attention: Forty minutes remaining until voting closes.",
  time_30min: "Attention: Thirty minutes remaining until voting closes.",
  time_20min: "Attention: Twenty minutes remaining until voting closes.",
  time_10min: "Attention: Ten minutes remaining until voting closes.",
  time_5min: "Attention: Five minutes remaining until voting closes.",
  time_2min: "Attention: Two minutes remaining until voting closes. Please complete your ballot.",
};

const cache = new Map();

function clipUrl(name) {
  return `../../assets/audio/${name}.mp3`;
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/** Plays a fixed announcement, falling back to speech if it hasn't been recorded. */
export function play(name) {
  const script = SCRIPTS[name];
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(clipUrl(name));
    audio.preload = "auto";
    cache.set(name, audio);
  }
  audio.currentTime = 0;
  const attempt = audio.play();
  if (attempt && typeof attempt.catch === "function") {
    attempt.catch(() => speak(script));
  }
  audio.onerror = () => speak(script);
}

/** For what no recording could cover: a candidate's name, a portfolio, a choice read back. */
export function announce(text) {
  speak(text);
}

export { SCRIPTS };
