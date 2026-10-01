import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as Speech from "expo-speech";
import { useFocusEffect } from "expo-router";
import { chunkForSpeech, inReadingOrder, joinForSpeech } from "./speech-words";

/**
 * Read Aloud: the website's button, on the phone.
 *
 * On the website it walks the page. A phone has no page to walk — what is on
 * screen is a tree of native views JavaScript cannot read back — so instead
 * everything that says something registers what it would say: a heading its
 * words, a button "Sign in, button.", a text box "First name, text box,
 * empty.", in the website's own vocabulary (speech-words.ts). Pressing Read
 * Aloud asks each where it sits on screen and reads them top to bottom.
 *
 * Reading by position rather than by the order things were rendered in is
 * deliberate: it is the order somebody sees them in, and the order a list
 * of cards inside a scroll view actually appears in.
 *
 * Only the screen in front is read. Tabs and stacks keep screens behind the
 * current one alive; each screen's registry is put forward when it gains
 * focus and withdrawn when it loses it, and a dialog puts its own on top
 * while it is open.
 *
 * This is not a replacement for TalkBack, and does not try to be: every
 * control also carries the label and role TalkBack reads. Read Aloud is for
 * the members who use the website's button — many of them, here.
 */

interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

interface Piece {
  ref: RefObject<Measurable | null>;
  say: () => string;
}

interface Registry {
  pieces: Set<Piece>;
}

interface ReadingValue {
  speaking: boolean;
  /** Reads the screen in front, or stops if already reading. */
  toggle: () => void;
  stop: () => void;
  /** Puts a registry in front. Returns how to take it away again. */
  bringForward: (registry: Registry) => () => void;
}

const ReadingContext = createContext<ReadingValue | null>(null);
const ScreenContext = createContext<Registry | null>(null);
/**
 * Set inside a button or a tappable card. The container speaks for what is
 * inside it — "Library, button." — and the words inside stay quiet, so they
 * are not read twice.
 */
const SpokenForContext = createContext(false);

async function readingOf(registry: Registry): Promise<string> {
  const placed = await Promise.all(
    [...registry.pieces].map(
      (piece) =>
        new Promise<{ x: number; y: number; text: string } | null>((resolve) => {
          const node = piece.ref.current;
          const text = piece.say().trim();
          if (!node?.measureInWindow || !text) return resolve(null);
          node.measureInWindow((x, y, width, height) =>
            // Nothing drawn — collapsed, or not laid out yet — is not read.
            resolve(width === 0 && height === 0 ? null : { x, y, text }),
          );
        }),
    ),
  );
  const present = placed.filter((piece): piece is { x: number; y: number; text: string } => piece !== null);
  return joinForSpeech(inReadingOrder(present).map((piece) => piece.text));
}

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [speaking, setSpeaking] = useState(false);
  const stack = useRef<Registry[]>([]);
  // Each reading gets a number, so a "done" from a reading that was stopped
  // cannot switch off the indicator for the one that replaced it.
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    void Speech.stop();
    setSpeaking(false);
  }, []);

  const bringForward = useCallback(
    (registry: Registry) => {
      stack.current = [...stack.current.filter((r) => r !== registry), registry];
      return () => {
        const wasInFront = stack.current[stack.current.length - 1] === registry;
        stack.current = stack.current.filter((r) => r !== registry);
        // Speech never carries on over a screen somebody has left.
        if (wasInFront) stop();
      };
    },
    [stop],
  );

  const toggle = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }
    const registry = stack.current[stack.current.length - 1];
    const thisRun = ++run.current;
    setSpeaking(true);

    void (async () => {
      const text = registry ? await readingOf(registry) : "";
      if (run.current !== thisRun) return;
      const chunks = chunkForSpeech(text || "There is nothing to read on this screen.");
      let index = 0;
      const next = () => {
        if (run.current !== thisRun) return;
        if (index >= chunks.length) {
          setSpeaking(false);
          return;
        }
        const finished = () => {
          if (run.current === thisRun) setSpeaking(false);
        };
        Speech.speak(chunks[index++], { onDone: next, onStopped: finished, onError: finished });
      };
      next();
    })();
  }, [speaking, stop]);

  const value = useMemo(() => ({ speaking, toggle, stop, bringForward }), [speaking, toggle, stop, bringForward]);
  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReading(): ReadingValue {
  const value = useContext(ReadingContext);
  if (!value) throw new Error("useReading was called outside ReadingProvider.");
  return value;
}

function useRegistry(): Registry {
  return useMemo(() => ({ pieces: new Set<Piece>() }), []);
}

/** Wraps a screen. While it is the screen in front, Read Aloud reads it. */
export function ReadableScreen({ children }: { children: ReactNode }) {
  const registry = useRegistry();
  const { bringForward } = useReading();
  useFocusEffect(useCallback(() => bringForward(registry), [bringForward, registry]));
  return <ScreenContext.Provider value={registry}>{children}</ScreenContext.Provider>;
}

/** Wraps a dialog. While it is open, Read Aloud reads it rather than the screen behind. */
export function ReadableDialog({ children, open }: { children: ReactNode; open: boolean }) {
  const registry = useRegistry();
  const { bringForward } = useReading();
  useEffect(() => (open ? bringForward(registry) : undefined), [open, bringForward, registry]);
  return <ScreenContext.Provider value={registry}>{children}</ScreenContext.Provider>;
}

/**
 * Registers something that says something. Attach the returned ref to the
 * view that shows it — that is where Read Aloud measures it from.
 *
 * `say` may change on every render (a text box's contents, a tick box's
 * state); the latest is what is read.
 */
export function useSpeakable<T extends Measurable>(say: string | null | undefined): RefObject<T | null> {
  const registry = useContext(ScreenContext);
  const spokenFor = useContext(SpokenForContext);
  const ref = useRef<T | null>(null);
  const latest = useRef(say ?? "");
  useLayoutEffect(() => {
    latest.current = say ?? "";
  });

  useEffect(() => {
    if (!registry || spokenFor) return;
    const piece: Piece = { ref, say: () => latest.current };
    registry.pieces.add(piece);
    return () => {
      registry.pieces.delete(piece);
    };
  }, [registry, spokenFor]);

  return ref;
}

/** Inside a button or tappable card: the container has already said it. */
export function SpokenFor({ children }: { children: ReactNode }) {
  return <SpokenForContext.Provider value>{children}</SpokenForContext.Provider>;
}
