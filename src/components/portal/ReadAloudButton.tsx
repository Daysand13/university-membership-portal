"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Shared across every button on the page: starting one card's reading
 * invalidates any other card's reading still queued up, so two never talk
 * over each other.
 */
let activeReading = 0;

const subscribeNoop = () => () => {};

/**
 * Reads one dashboard card aloud with the browser's built-in speech
 * synthesis (the Web Speech API) — for someone who finds it easier to listen
 * to announcements than to read them. The page-wide Read Aloud control in
 * the accessibility toolbar reads everything; this reads just one card.
 *
 * Renders nothing where speech synthesis isn't available, rather than a
 * button that does nothing.
 */
export function ReadAloudButton({ targetId, label }: { targetId: string; label: string }) {
  const supported = useSyncExternalStore(
    subscribeNoop,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  // Leaving the page mid-sentence shouldn't leave the browser talking.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      activeReading++;
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const text = document.getElementById(targetId)?.innerText?.trim();
    if (!text) return;

    synth.cancel();
    const run = ++activeReading;
    // Some browsers cut off one long utterance, so it's read in sentences.
    const chunks = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
    let index = 0;

    const speakNext = () => {
      if (run !== activeReading || index >= chunks.length) {
        if (run === activeReading) setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = document.documentElement.lang || "en";
      utterance.onend = speakNext;
      utterance.onerror = () => {
        if (run === activeReading) setSpeaking(false);
      };
      synth.speak(utterance);
    };

    setSpeaking(true);
    speakNext();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={speaking ? `Stop reading ${label}` : `Read ${label} aloud`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-xs font-semibold text-primary-800 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      {speaking ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
      <span>{speaking ? "Stop" : "Listen"}</span>
    </button>
  );
}
