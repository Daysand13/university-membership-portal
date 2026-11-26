"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ExternalLink,
  Hand,
  LayoutGrid,
  Loader2,
  Maximize,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
  Waves,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { callCheckInAction, joinCallAction, leaveCallAction } from "@/lib/actions/mentorship-call-actions";
import { HEARTBEAT_MS, type MeetingSetup } from "@/lib/mentorship-call";

/**
 * The call itself.
 *
 * The meeting runs on a Jitsi service, embedded here so somebody joins from
 * inside their own portal. Jitsi draws its own toolbar inside the call, but
 * that toolbar lives in another site's frame, and a screen reader user
 * moving through this page meets it as a wall of unlabelled icons. So this
 * page has its own controls underneath — real buttons, each with a name
 * and an on/off state a screen reader reads out — and says out loud what
 * happens in the call: who came in, who left, who is waiting, whether the
 * screen is being shared.
 *
 * Some things matter more than the embed:
 *
 *  - It never starts the camera on its own. Somebody opening the page
 *    presses Join, and the browser asks before anything turns on.
 *  - Voice only is a first-class choice. Plenty of calls here happen on a
 *    phone with little data, and a blind member has no use for video.
 *  - Nothing is recorded. The service is told to turn recording, live
 *    streaming and transcription off, and they are not on the toolbar.
 *  - Where the public meet.jit.si is in use, the call opens in its own tab:
 *    meet.jit.si ends calls embedded in other sites after five minutes,
 *    and a call that cuts out mid-sentence is worse than a new tab.
 */

interface JitsiDevice {
  deviceId: string;
  label: string;
}
interface JitsiDevices {
  audioInput?: JitsiDevice[];
  audioOutput?: JitsiDevice[];
  videoInput?: JitsiDevice[];
}

interface JitsiApi {
  dispose: () => void;
  addEventListener: (event: string, handler: (payload: never) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  getAvailableDevices: () => Promise<JitsiDevices>;
  getCurrentDevices: () => Promise<{ audioInput?: JitsiDevice; audioOutput?: JitsiDevice; videoInput?: JitsiDevice }>;
  setAudioInputDevice: (label: string, deviceId: string) => void;
  setAudioOutputDevice: (label: string, deviceId: string) => void;
  setVideoInputDevice: (label: string, deviceId: string) => void;
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

type State = "idle" | "joining" | "in" | "elsewhere" | "blocked" | "ended" | "lost";

/** A toggle in the call's own control bar. The name never changes; the state is aria-pressed. */
function Toggle({
  label,
  pressed,
  onClick,
  icon,
  offIcon,
  stateText,
  badge,
  disabled,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: ReactNode;
  offIcon?: ReactNode;
  stateText?: [on: string, off: string];
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-800 disabled:opacity-50 ${
        pressed ? "border-primary-800 bg-primary-800 text-white" : "border-line bg-white text-primary-950 hover:border-primary-400"
      }`}
    >
      <span aria-hidden="true">{pressed || !offIcon ? icon : offIcon}</span>
      {label}
      {stateText && (
        <span aria-hidden="true" className={`text-xs font-normal ${pressed ? "text-primary-100" : "text-slate"}`}>
          {pressed ? stateText[0] : stateText[1]}
        </span>
      )}
      {badge}
    </button>
  );
}

export function CallRoom({
  meeting,
  side,
  mentorshipId,
  sessionId,
  displayName,
  otherName,
  leaveHref,
  otherIsWaiting,
}: {
  meeting: MeetingSetup;
  side: "student" | "mentor";
  mentorshipId: string;
  sessionId?: string | null;
  displayName: string;
  otherName: string;
  /** Where "back to the conversation" goes. */
  leaveHref: string;
  /** The other side started a call and is in it now. */
  otherIsWaiting?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [withVideo, setWithVideo] = useState(true);
  const [connected, setConnected] = useState(false);

  // What the call is doing, as Jitsi reports it.
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [handUp, setHandUp] = useState(false);
  const [tiles, setTiles] = useState(false);
  const [quietMic, setQuietMic] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [isModerator, setIsModerator] = useState(meeting.moderator);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [knocking, setKnocking] = useState<{ id: string; name: string }[]>([]);
  const [devices, setDevices] = useState<JitsiDevices>({});
  const [current, setCurrent] = useState<{ audioInput?: string; audioOutput?: string; videoInput?: string }>({});
  const [news, setNews] = useState("");

  const frame = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const callId = useRef<string | null>(null);
  const myId = useRef<string | null>(null);
  const peopleRef = useRef<Record<string, string>>({});
  const leaving = useRef(false);

  const canShareScreen =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";

  const say = useCallback((text: string) => {
    // Cleared first so the same sentence twice is still announced twice.
    setNews("");
    window.setTimeout(() => setNews(text), 60);
  }, []);

  const startCall = useCallback(async (): Promise<boolean> => {
    const result = await joinCallAction({ side, mentorshipId, withVideo, sessionId: sessionId ?? null });
    if ("error" in result) {
      setError(result.error);
      return false;
    }
    callId.current = result.callId;
    return true;
  }, [side, mentorshipId, withVideo, sessionId]);

  // While somebody is in the call, the page checks in so the call stays open
  // in the record. If it went quiet in the meantime — a laptop lid closed for
  // ten minutes — the page simply joins again.
  useEffect(() => {
    if (state !== "in" && state !== "elsewhere") return;
    const timer = window.setInterval(async () => {
      if (!callId.current) return;
      const { live } = await callCheckInAction({ side, callId: callId.current });
      if (!live) await startCall();
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [state, side, startCall]);

  useEffect(() => {
    const onChange = () => setFullScreen(document.fullscreenElement === wrapper.current && wrapper.current !== null);
    const offline = () => say("Your internet connection has dropped. The call will try to carry on when it is back.");
    const online = () => say("Your internet connection is back.");
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      api.current?.dispose();
      api.current = null;
    };
  }, [say]);

  const finish = useCallback(
    async (ended: State) => {
      if (leaving.current) return;
      leaving.current = true;
      api.current?.dispose();
      api.current = null;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setState(ended);
      setConnected(false);
      setSharing(false);
      setKnocking([]);
      if (callId.current) await leaveCallAction({ side, callId: callId.current });
    },
    [side],
  );

  const refreshDevices = useCallback(async () => {
    if (!api.current) return;
    try {
      const [available, now] = await Promise.all([api.current.getAvailableDevices(), api.current.getCurrentDevices()]);
      setDevices(available ?? {});
      setCurrent({
        audioInput: now?.audioInput?.deviceId,
        audioOutput: now?.audioOutput?.deviceId,
        videoInput: now?.videoInput?.deviceId,
      });
    } catch {
      // Some browsers won't list devices; Jitsi's own settings still work.
    }
  }, []);

  const join = async () => {
    setError(null);
    setState("joining");
    leaving.current = false;
    peopleRef.current = {};
    setPeople({});
    if (!(await startCall())) {
      setState("idle");
      return;
    }
    try {
      await loadScript(meeting.scriptUrl);
    } catch {
      setState("blocked");
      return;
    }
    const Api = window.JitsiMeetExternalAPI;
    if (!Api || !frame.current) {
      setState("blocked");
      return;
    }

    setMicOn(true);
    setCameraOn(withVideo);
    const instance = new Api(meeting.domain, {
      roomName: meeting.roomName,
      parentNode: frame.current,
      width: "100%",
      height: "100%",
      ...(meeting.jwt ? { jwt: meeting.jwt } : {}),
      userInfo: { displayName },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: !withVideo,
        prejoinConfig: { enabled: false },
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableInviteFunctions: true,
        readOnlyName: true,
        // Nothing is recorded, streamed or transcribed.
        fileRecordingsEnabled: false,
        liveStreamingEnabled: false,
        localRecording: { disable: true },
        recordingService: { enabled: false },
        transcription: { enabled: false },
        disableThirdPartyRequests: true,
        lobby: { autoKnock: true },
        subject: "Mentorship call",
        toolbarButtons: [
          "microphone",
          "camera",
          "desktop",
          "chat",
          "raisehand",
          "participants-pane",
          "tileview",
          "noisesuppression",
          "toggle-camera",
          "select-background",
          "settings",
          "fullscreen",
          "hangup",
        ],
      },
      interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
    });
    api.current = instance;

    const on = <T,>(event: string, handler: (payload: T) => void) =>
      instance.addEventListener(event, handler as (payload: never) => void);

    on<{ id: string }>("videoConferenceJoined", (p) => {
      myId.current = p.id;
      setConnected(true);
      say(
        Object.keys(peopleRef.current).length
          ? `You are in the call with ${otherName}.`
          : `You are in the call. ${otherName} has been told and can join you.`,
      );
      void refreshDevices();
    });
    on<{ id: string; displayName?: string }>("participantJoined", (p) => {
      const name = p.displayName || "Somebody";
      peopleRef.current = { ...peopleRef.current, [p.id]: name };
      setPeople(peopleRef.current);
      say(`${name} joined the call.`);
    });
    on<{ id: string }>("participantLeft", (p) => {
      const name = peopleRef.current[p.id] || "Somebody";
      const rest = { ...peopleRef.current };
      delete rest[p.id];
      peopleRef.current = rest;
      setPeople(rest);
      say(`${name} left the call.`);
    });
    on<{ id: string; displayname?: string }>("displayNameChange", (p) => {
      if (p.id in peopleRef.current && p.displayname) {
        peopleRef.current = { ...peopleRef.current, [p.id]: p.displayname };
        setPeople(peopleRef.current);
      }
    });
    on<{ muted: boolean }>("audioMuteStatusChanged", (p) => {
      setMicOn(!p.muted);
      say(p.muted ? "Your microphone is off." : "Your microphone is on.");
    });
    on<{ muted: boolean }>("videoMuteStatusChanged", (p) => {
      setCameraOn(!p.muted);
      say(p.muted ? "Your camera is off." : "Your camera is on.");
    });
    on<{ on: boolean }>("screenSharingStatusChanged", (p) => {
      setSharing(p.on);
      say(p.on ? "You are sharing your screen. Everyone in the call can see it." : "You have stopped sharing your screen.");
    });
    on<{ isOpen: boolean; unreadCount: number }>("chatUpdated", (p) => {
      setChatOpen(p.isOpen);
      setUnread(p.unreadCount);
    });
    on<{ nick?: string; privateMessage?: boolean }>("incomingMessage", (p) => {
      say(`New chat message from ${p.nick || otherName}.`);
    });
    on<{ id: string; handRaised: number }>("raiseHandUpdated", (p) => {
      if (p.id === myId.current) setHandUp(p.handRaised > 0);
      else if (p.handRaised > 0) say(`${peopleRef.current[p.id] || otherName} raised their hand.`);
    });
    on<{ enabled: boolean }>("tileViewChanged", (p) => setTiles(p.enabled));
    on<{ id: string; role: string }>("participantRoleChanged", (p) => {
      if (p.id === myId.current) setIsModerator(p.role === "moderator");
    });
    on<{ participant: { id: string; name: string } }>("knockingParticipant", (p) => {
      setKnocking((list) => (list.some((k) => k.id === p.participant.id) ? list : [...list, p.participant]));
      say(`${p.participant.name || "Somebody"} is waiting to join. Let them in or turn them away, below the call.`);
    });
    on<{ kicked: { local: boolean } }>("participantKickedOut", (p) => {
      if (p.kicked.local) void finish("ended");
    });
    on<{ isFatal?: boolean; name?: string }>("errorOccurred", (p) => {
      // "notAllowed" is the service refusing this page's pass - in practice
      // one that expired because the page sat open for hours. Not marked
      // fatal by Jitsi, but nothing will happen without a fresh pass.
      if (p.isFatal || /notAllowed|authentication/i.test(p.name ?? "")) {
        say("The call couldn't continue. Reload this page and join again.");
        void finish("lost");
      }
    });
    on("deviceListChanged", () => void refreshDevices());
    on("videoConferenceLeft", () => void finish("ended"));
    on("readyToClose", () => void finish("ended"));

    setState("in");
  };

  const command = (name: string, ...args: unknown[]) => api.current?.executeCommand(name, ...args);

  const toggleFullScreen = async () => {
    if (!wrapper.current) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else await wrapper.current.requestFullscreen().catch(() => say("Full screen isn't available in this browser."));
  };

  const toggleQuietMic = () => {
    const next = !quietMic;
    command("setNoiseSuppressionEnabled", { enabled: next });
    setQuietMic(next);
    say(next ? "Background noise reduction is on." : "Background noise reduction is off.");
  };

  const toggleWaitingRoom = () => {
    const next = !waitingRoom;
    command("toggleLobby", next);
    setWaitingRoom(next);
    say(next ? "Waiting room on. Anybody new waits until you let them in." : "Waiting room off.");
  };

  const answer = (id: string, approved: boolean) => {
    command("answerKnockingParticipant", id, approved);
    setKnocking((list) => list.filter((k) => k.id !== id));
    say(approved ? "Let in." : "Turned away.");
  };

  const pickDevice = (kind: "audioInput" | "audioOutput" | "videoInput", deviceId: string) => {
    const device = devices[kind]?.find((d) => d.deviceId === deviceId);
    if (!device || !api.current) return;
    if (kind === "audioInput") api.current.setAudioInputDevice(device.label, device.deviceId);
    if (kind === "audioOutput") api.current.setAudioOutputDevice(device.label, device.deviceId);
    if (kind === "videoInput") api.current.setVideoInputDevice(device.label, device.deviceId);
    setCurrent((c) => ({ ...c, [kind]: deviceId }));
  };

  const others = Object.values(people);
  const live = state === "in" || state === "joining";

  // ---------------------------------------------------------------- in a call
  if (live) {
    return (
      <div key="live" ref={wrapper} className={fullScreen ? "flex h-full flex-col gap-3 overflow-auto bg-white p-3" : "space-y-3"}>
        <p role="status" aria-live="polite" className="sr-only">
          {news}
        </p>

        {sharing && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning bg-warning-light px-4 py-3">
            <p className="font-semibold text-ink">
              <MonitorUp size={16} aria-hidden="true" className="mr-1.5 inline" />
              You are sharing your screen. Everyone in the call can see it.
            </p>
            <button type="button" onClick={() => command("toggleShareScreen")} className={buttonClasses("danger", "sm")}>
              Stop sharing
            </button>
          </div>
        )}

        {/* Keyed so React never hands this element, and whatever Jitsi put
            inside it, to some other part of the page afterwards. */}
        <div
          key="call-frame"
          ref={frame}
          className={`overflow-hidden rounded-xl border border-line bg-primary-950 ${
            fullScreen ? "min-h-0 flex-1" : "h-[min(60vh,600px)] min-h-[340px]"
          }`}
        />

        {state === "joining" || !connected ? (
          <p role="status" className="flex items-center gap-2 text-sm text-slate">
            <Loader2 size={15} aria-hidden="true" className="animate-spin" /> Connecting you to the call…
          </p>
        ) : (
          <p className="text-sm text-slate">
            {others.length ? <>In the call: you and {others.join(", ")}.</> : <>Waiting for {otherName} to join.</>}{" "}
            {news && <span aria-hidden="true">{news}</span>}
          </p>
        )}

        {knocking.length > 0 && (
          <ul className="space-y-2" aria-label="Waiting to join">
            {knocking.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3">
                <span className="font-semibold text-primary-950">{k.name || "Somebody"} is waiting to join.</span>
                <button type="button" onClick={() => answer(k.id, true)} className={buttonClasses("primary", "sm")}>
                  Let {k.name || "them"} in
                </button>
                <button type="button" onClick={() => answer(k.id, false)} className={buttonClasses("outline", "sm")}>
                  Turn {k.name || "them"} away
                </button>
              </li>
            ))}
          </ul>
        )}

        <div role="group" aria-label="Call controls" className="flex flex-wrap gap-2">
          <Toggle label="Microphone" pressed={micOn} onClick={() => command("toggleAudio")} icon={<Mic size={16} />} offIcon={<MicOff size={16} />} stateText={["on", "off"]} disabled={!connected} />
          <Toggle label="Camera" pressed={cameraOn} onClick={() => command("toggleVideo")} icon={<Video size={16} />} offIcon={<VideoOff size={16} />} stateText={["on", "off"]} disabled={!connected} />
          {canShareScreen && (
            <Toggle label="Share screen" pressed={sharing} onClick={() => command("toggleShareScreen")} icon={<MonitorUp size={16} />} disabled={!connected} />
          )}
          <Toggle
            label="Chat"
            pressed={chatOpen}
            onClick={() => command("toggleChat")}
            icon={<MessageSquare size={16} />}
            disabled={!connected}
            badge={
              unread > 0 && !chatOpen ? (
                <span className="rounded-full bg-accent-600 px-1.5 text-xs text-white">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null
            }
          />
          <Toggle label="Raise hand" pressed={handUp} onClick={() => command("toggleRaiseHand")} icon={<Hand size={16} />} disabled={!connected} />
          <Toggle label="Tile view" pressed={tiles} onClick={() => command("toggleTileView")} icon={<LayoutGrid size={16} />} disabled={!connected} />
          <Toggle label="Reduce background noise" pressed={quietMic} onClick={toggleQuietMic} icon={<Waves size={16} />} disabled={!connected} />
          <Toggle label="Full screen" pressed={fullScreen} onClick={toggleFullScreen} icon={<Maximize size={16} />} />
          {isModerator && (
            <Toggle label="Waiting room" pressed={waitingRoom} onClick={toggleWaitingRoom} icon={<ShieldCheck size={16} />} disabled={!connected} />
          )}
          <button
            type="button"
            onClick={() => (api.current ? command("hangup") : void finish("ended"))}
            className={`${buttonClasses("danger", "md")} min-h-11`}
          >
            <PhoneOff size={16} aria-hidden="true" /> Leave the call
          </button>
        </div>

        {!canShareScreen && (
          <p className="text-xs text-slate">
            Screen sharing needs a computer: phone and tablet browsers don&apos;t allow a website to share the screen.
          </p>
        )}

        {connected && (devices.audioInput?.length || devices.audioOutput?.length || devices.videoInput?.length) ? (
          <details className="rounded-lg border border-line bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-primary-950">Microphone, speaker and camera</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["audioInput", "Microphone"],
                  ["audioOutput", "Speaker"],
                  ["videoInput", "Camera"],
                ] as const
              ).map(([kind, label]) =>
                devices[kind]?.length ? (
                  <div key={kind}>
                    <label htmlFor={`call-${kind}`} className="block text-sm font-semibold text-primary-950 mb-1">
                      {label}
                    </label>
                    <select
                      id={`call-${kind}`}
                      value={current[kind] ?? ""}
                      onChange={(e) => pickDevice(kind, e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    >
                      {!current[kind] && <option value="">Choose…</option>}
                      {devices[kind]!.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null,
              )}
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  // ------------------------------------------- in a call, in a tab of its own
  if (state === "elsewhere") {
    return (
      <div key="elsewhere" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-primary-950">The call is open in another tab</h2>
        <p className="text-ink mt-2">
          {otherName} has been told and can join you there. Keep this page open while you talk, and come back to it when
          you are done.
        </p>
        <p className="text-sm text-slate mt-2">
          If meet.jit.si asks the first person in to sign in, that is meet.jit.si&apos;s own rule for starting a room; a
          Google, GitHub or Facebook account will do.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md")}>
            <ExternalLink size={15} aria-hidden="true" /> Open the call again
          </a>
          <button type="button" onClick={() => void finish("ended")} className={buttonClasses("primary", "md")}>
            I&apos;ve finished the call
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------- before, or after
  const opensInTab = meeting.mode === "new-tab";

  return (
    <div key="card" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
      {state === "ended" ? (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">You have left the call</h2>
          <p className="text-ink mt-2">You can call again whenever you like. {otherName} may still be in the room.</p>
        </>
      ) : state === "lost" ? (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">The call lost its connection</h2>
          <p className="text-ink mt-2">
            Check your internet, then reload this page and join again — you&apos;ll come back to the same room.
          </p>
        </>
      ) : state === "blocked" ? (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">The call won&apos;t open in this page</h2>
          <p className="text-ink mt-2">
            Something on this device is stopping it from loading here. The same room opens in a new tab, and {otherName} will
            be in it.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display font-bold text-lg text-primary-950">
            {otherIsWaiting ? `${otherName} is in the call, waiting for you` : `Talk to ${otherName}`}
          </h2>
          <p className="text-ink mt-2">
            Nothing is switched on until you join, and your browser will ask before it uses your microphone or camera.
            {otherIsWaiting ? "" : ` ${otherName} will be told you are calling.`} Calls are never recorded.
          </p>
          {!opensInTab && (
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
                      checked={withVideo === option.value}
                      onChange={() => setWithVideo(option.value)}
                      className="h-4 w-4 text-primary-800"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {opensInTab && (
            <p className="text-sm text-slate mt-3">
              The call opens on meet.jit.si in a new tab. Calls there have no time limit; calls built into other websites
              are cut off after five minutes, which is why it isn&apos;t inside this page.
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-danger bg-danger-light px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {opensInTab || state === "blocked" ? (
          <a
            href={meeting.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={async () => {
              // The link opens the tab itself, so no browser blocks it as a
              // pop-up; the call is recorded alongside.
              setError(null);
              leaving.current = false;
              if (await startCall()) setState("elsewhere");
            }}
            className={buttonClasses("primary", "md")}
          >
            <ExternalLink size={15} aria-hidden="true" /> {state === "ended" ? "Open the call again" : "Open the call"}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <>
            <button
              type="button"
              // After a lost call the pass may have expired; reloading signs a fresh one.
              onClick={state === "lost" ? () => window.location.reload() : join}
              className={buttonClasses("primary", "md")}
            >
              {state === "lost" ? "Reload and join again" : state === "ended" ? "Join again" : otherIsWaiting ? "Join the call" : "Start the call"}
            </button>
            <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md")}>
              <ExternalLink size={15} aria-hidden="true" /> Open in a new tab
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        )}
        <a href={leaveHref} className="text-sm font-semibold text-slate hover:text-primary-800">
          Back to the conversation
        </a>
      </div>
    </div>
  );
}
