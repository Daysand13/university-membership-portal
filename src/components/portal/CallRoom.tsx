"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

/**
 * The call itself.
 *
 * The meeting runs on the service the association points at, embedded here
 * so somebody joins from inside their own portal rather than being sent
 * off to a link they then have to find their way back from.
 *
 * Three things matter more than the embed:
 *
 *  - It never starts the camera on its own. A member opening a page should
 *    not find themselves broadcasting; they press Join, and the browser
 *    asks before anything turns on.
 *  - Audio-only is a first-class choice, not a fallback. Plenty of calls
 *    here happen on a phone with little data, and a blind member has no
 *    use for video in either direction.
 *  - If the embed will not load — a blocked script, an old browser — the
 *    plain link to the same room is always on the page.
 */

interface JitsiApi {
  dispose: () => void;
  addEventListener: (event: string, handler: () => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.JitsiMeetExternalAPI) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("blocked")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("blocked")), { once: true });
    document.body.appendChild(script);
  });
}

export function CallRoom({
  domain,
  room,
  displayName,
  otherName,
  leaveHref,
}: {
  domain: string;
  room: string;
  displayName: string;
  otherName: string;
  /** Where "leave the call" goes back to. */
  leaveHref: string;
}) {
  const [state, setState] = useState<"idle" | "joining" | "in" | "blocked" | "ended">("idle");
  const [withVideo, setWithVideo] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const joinUrl = `https://${domain}/${room}`;

  useEffect(() => {
    return () => {
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  const join = async () => {
    setState("joining");
    try {
      await loadScript(`https://${domain}/external_api.js`);
    } catch {
      setState("blocked");
      return;
    }
    const Api = window.JitsiMeetExternalAPI;
    if (!Api || !holder.current) {
      setState("blocked");
      return;
    }

    api.current = new Api(domain, {
      roomName: room,
      parentNode: holder.current,
      width: "100%",
      height: 520,
      userInfo: { displayName },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: !withVideo,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
    });
    api.current.addEventListener("videoConferenceLeft", () => {
      api.current?.dispose();
      api.current = null;
      setState("ended");
    });
    setState("in");
  };

  if (state === "in" || state === "joining") {
    return (
      <div>
        <div ref={holder} className="rounded-xl overflow-hidden border border-line bg-primary-950 min-h-[320px]" />
        {state === "joining" && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate">
            <Loader2 size={15} aria-hidden="true" className="animate-spin" /> Connecting you to the call…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
      {state === "ended" ? (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">You have left the call</h2>
          <p className="text-ink mt-2">
            You can join again while the session is on, and {otherName} may still be in the room.
          </p>
        </>
      ) : state === "blocked" ? (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">The call won&apos;t open in this page</h2>
          <p className="text-ink mt-2">
            Something on this device is stopping it from loading here. The same room opens in a new tab, and
            {" "}
            {otherName} will be in it.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">Talk to {otherName}</h2>
          <p className="text-ink mt-2">
            Nothing is switched on until you join, and your browser will ask before it uses your microphone or camera.
          </p>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-primary-950 mb-2">How would you like to join?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: true, label: "Voice and video" },
                { value: false, label: "Voice only" },
              ].map((option) => (
                <label
                  key={String(option.value)}
                  htmlFor={`call-mode-${option.value}`}
                  className="flex items-center gap-2.5 rounded-lg border border-line p-3 text-sm font-semibold text-primary-950 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
                >
                  <input
                    id={`call-mode-${option.value}`}
                    type="radio"
                    name="call-mode"
                    aria-label={option.label}
                    checked={withVideo === option.value}
                    onChange={() => setWithVideo(option.value)}
                    className="h-4 w-4 text-primary-800"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {state !== "blocked" && (
          <button type="button" onClick={join} className={buttonClasses("primary", "md")}>
            {state === "ended" ? "Join again" : "Join the call"}
          </button>
        )}
        <a href={joinUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md")}>
          <ExternalLink size={15} aria-hidden="true" /> Open in a new tab
        </a>
        <a href={leaveHref} className="text-sm font-semibold text-slate hover:text-primary-800">
          Back to the conversation
        </a>
      </div>
    </div>
  );
}
