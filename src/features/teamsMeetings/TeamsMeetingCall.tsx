// BF_PORTAL_v888_TEAMS_IN_APP - the Teams meeting itself, inside the app, on the Azure Communication
// Services Calling SDK (Teams interop). Loaded lazily, only when someone joins a meeting.
//
// We use the Calling SDK directly rather than the @azure/communication-react composites: the
// composites pull in two versions of Fluent UI and a rich-text editor (an 8 MB chunk), and the
// portal build no longer fits in CI's default memory. This screen covers what a Boreal meeting
// needs: the Teams lobby, everyone's video and shared screens, mute, camera and leave.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CallClient, Features, LocalVideoStream, VideoStreamRenderer,
  type Call, type CallAgent, type DeviceManager, type RemoteParticipant, type RemoteVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { screenShareSupported } from "./screenShare";
import { chatToken, listChat, sendChat, type ChatMessage } from "./meetingChat";

export type CallTicket = { token: string; acsUserId: string; displayName: string; joinUrl: string; subject?: string | null; identity?: "teams" | "guest" }; // BF_PORTAL_v890_TEAMS_IDENTITY
type Phase = "starting" | "lobby" | "connected" | "ended" | "error";
type Person = { key: string; name: string; muted: boolean; speaking?: boolean; hand?: boolean; id?: string };
// BF_PORTAL_v964_CALL_CONTROLS - the rest of what a meeting needs: who is waiting and who is in (admit, decline, mute,
// remove), microphone / speaker / camera choice, screen sharing, raise hand, reactions, live captions, a recording
// and transcription indicator, a timer and the invite link. Every SDK feature is reached through `feat()`, which
// returns null when the feature is missing, so a meeting never fails to open because one extra is unavailable.
type Waiting = { id: string; name: string };
type Device = { id: string; name: string };
type Panel = null | "people" | "devices" | "chat";
export type CaptionLine = { who: string; text: string };

/** One stable text id for a participant, whichever kind of identity Teams gave them. */
export function participantId(identifier: unknown): string {
  const i = identifier as Record<string, unknown> | null;
  return String(i?.rawId ?? i?.microsoftTeamsUserId ?? i?.communicationUserId ?? i?.phoneNumber ?? i?.id ?? "");
}
/** Keeps the last few finished caption lines plus the one still being spoken. */
export function addCaption(lines: CaptionLine[], who: string, text: string, final: boolean, partial: CaptionLine | null): { lines: CaptionLine[]; partial: CaptionLine | null } {
  const line = { who: who || "Someone", text: String(text ?? "").trim() };
  if (!line.text) return { lines, partial };
  return final ? { lines: [...lines, line].slice(-3), partial: null } : { lines, partial: line };
}
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(r).padStart(2, "0");
}
/**
 * BF_PORTAL_v965_CALL_FIT - what to say when an action did not happen. Closing the browser's "choose what to share"
 * box is not a refusal by Teams, so it gets no warning; anything else carries the browser's or Teams' own reason so
 * a real refusal can be told apart from a permission the browser or the Mac is missing.
 */
export function failureNote(what: string, err: unknown): string {
  const e = err as { name?: string; message?: string; code?: number; subCode?: number } | null;
  const text = String(e?.message ?? err ?? "");
  const cancelled = /share/.test(what) && (e?.name === "NotAllowedError" || /permission denied|denied by user|cancel|dismiss|abort/i.test(text));
  if (cancelled) return /system/i.test(text) ? "Your Mac is blocking screen sharing for this browser. Allow it in System Settings, Privacy & Security, Screen Recording, then try again." : "";
  const detail = [text.replace(/\s+/g, " ").slice(0, 140), e?.code ? "code " + e.code : "", e?.subCode ? "sub " + e.subCode : ""].filter(Boolean).join(", ");
  return "We couldn't " + what + "." + (detail ? " (" + detail + ")" : " Teams may not allow it in this meeting.");
}
const feat = (call: Call | null, name: string): any => {
  try { const f = (Features as unknown as Record<string, unknown> | undefined)?.[name]; return call && f ? (call as any).feature(f) : null; } catch { return null; }
};
const smallBtn: CSSProperties = { padding: "4px 10px", borderRadius: 6, border: "1px solid #605e5c", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 12 };
const selectStyle: CSSProperties = { width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #605e5c", background: "#201f1e", color: "#fff", fontSize: 13 };

/** Plain-English reason a meeting ended for us (codes from the ACS call end reasons). */
export function endMessage(code: number | undefined, subCode: number | undefined): string {
  if (subCode === 5854 || subCode === 5829) return "The organiser didn't let you in from the lobby.";
  if (subCode === 5300 || subCode === 5000) return "You were removed from the meeting.";
  if (code === 0 || code === undefined) return "You've left the meeting.";
  if (code === 403) return "You aren't allowed into this meeting.";
  if (code === 404) return "This meeting has ended or can't be found.";
  return "The meeting connection was lost.";
}

const btn = (on: boolean, danger = false): CSSProperties => ({
  minWidth: 96, padding: "10px 16px", borderRadius: 999, border: 0, cursor: "pointer", fontWeight: 600, fontSize: 14,
  background: danger ? "#c4314b" : on ? "#ffffff" : "#3b3a39", color: danger ? "#fff" : on ? "#11100f" : "#fff",
});

export default function TeamsMeetingCall({ ticket, onEnded }: { ticket: CallTicket; onEnded: () => void }): JSX.Element {
  const [phase, setPhase] = useState<Phase>("starting");
  const [message, setMessage] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  // BF_PORTAL_TEAMS_BLUR_v1 - background blur on the camera (Azure Communication Services video effects). The effects
  // package is loaded only when the meeting starts with a camera; the button shows only where the device supports it.
  const [blurOn, setBlurOn] = useState(false);
  const [blurSupported, setBlurSupported] = useState(false);
  const blurRef = useRef<unknown>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [sharing, setSharing] = useState(false);
  const [hand, setHand] = useState(false);
  const [recording, setRecording] = useState<boolean | null>(null);
  const [transcribing, setTranscribing] = useState<boolean | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captions, setCaptions] = useState<{ lines: CaptionLine[]; partial: CaptionLine | null }>({ lines: [], partial: null });
  const [mics, setMics] = useState<Device[]>([]);
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [cams, setCams] = useState<Device[]>([]);
  const [chosen, setChosen] = useState<{ mic: string; speaker: string; cam: string }>({ mic: "", speaker: "", cam: "" });
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(0);
  // BF_PORTAL_v966_MEETING_CHAT
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatState, setChatState] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [chatSeen, setChatSeen] = useState(0);
  const [draft, setDraft] = useState("");
  const chatTokenRef = useRef<string>("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const devicesRef = useRef<DeviceManager | null>(null);
  const rawDevices = useRef<{ mics: any[]; speakers: any[]; cams: any[] }>({ mics: [], speakers: [], cams: [] });
  const callRef = useRef<Call | null>(null);
  const cameraRef = useRef<LocalVideoStream | null>(null);
  const selfRendererRef = useRef<VideoStreamRenderer | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const selfRef = useRef<HTMLDivElement | null>(null);

  const showSelf = useCallback(async (stream: LocalVideoStream | null) => {
    selfRendererRef.current?.dispose();
    selfRendererRef.current = null;
    if (selfRef.current) selfRef.current.innerHTML = "";
    if (!stream || !selfRef.current) return;
    const r = new VideoStreamRenderer(stream);
    selfRendererRef.current = r;
    const view = await r.createView({ isMirrored: true, scalingMode: "Crop" });
    selfRef.current?.appendChild(view.target);
  }, []);

  useEffect(() => {
    let gone = false;
    let agent: CallAgent | null = null;
    const client = new CallClient();
    const renderers = new Map<RemoteVideoStream, { renderer: VideoStreamRenderer; tile: HTMLElement }>();

    const refreshPeople = (call: Call) => {
      if (gone) return;
      let hands = new Set<string>();
      try { hands = new Set<string>((feat(call, "RaiseHand")?.getRaisedHands?.() ?? []).map((h: any) => participantId(h.identifier))); } catch { /* no raise-hand here */ }
      setPeople(call.remoteParticipants.filter((p) => (p as any).state !== "InLobby").map((p, i) => {
        const id = participantId((p as any).identifier);
        return { key: String(i) + ":" + (p.displayName ?? ""), name: p.displayName || "Guest", muted: p.isMuted, speaking: Boolean((p as any).isSpeaking), hand: Boolean(id && hands.has(id)), id };
      }));
    };
    const refreshWaiting = (call: Call) => {
      if (gone) return;
      const list: any[] = [...(((call as any).lobby?.participants ?? []) as any[])];
      setWaiting(list.map((p) => ({ id: participantId(p.identifier), name: p.displayName || "Guest" })).filter((w) => w.id));
    };

    const showStream = async (p: RemoteParticipant, s: RemoteVideoStream) => {
      if (renderers.has(s) || !s.isAvailable || !gridRef.current) return;
      const tile = document.createElement("div");
      tile.setAttribute("data-testid", "meeting-tile");
      tile.style.cssText = "position:relative;background:#000;border-radius:10px;overflow:hidden;min-height:0;min-width:0;height:100%"; // BF_PORTAL_v965_CALL_FIT - a tile is as tall as the space it is given, never as tall as the video
      const label = document.createElement("span");
      label.textContent = (p.displayName || "Guest") + (s.mediaStreamType === "ScreenSharing" ? " (screen)" : "");
      label.style.cssText = "position:absolute;left:8px;bottom:8px;color:#fff;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:6px;font-size:12px;z-index:1";
      const renderer = new VideoStreamRenderer(s);
      renderers.set(s, { renderer, tile });
      try {
        const view = await renderer.createView({ scalingMode: "Fit" }); // the whole person, letterboxed, not a cropped slice
        if (gone) { renderer.dispose(); return; }
        view.target.style.cssText += ";position:absolute;inset:0;width:100%;height:100%";
        tile.appendChild(view.target);
        tile.appendChild(label);
        gridRef.current?.appendChild(tile);
      } catch (err) {
        renderers.delete(s);
        renderer.dispose();
        console.warn("[teams-in-app] could not show a video", err);
      }
    };
    const hideStream = (s: RemoteVideoStream) => {
      const r = renderers.get(s);
      if (!r) return;
      r.renderer.dispose();
      r.tile.remove();
      renderers.delete(s);
    };
    const watchStream = (p: RemoteParticipant, s: RemoteVideoStream) => {
      void showStream(p, s);
      s.on("isAvailableChanged", () => { if (s.isAvailable) void showStream(p, s); else hideStream(s); });
    };
    const watchParticipant = (call: Call, p: RemoteParticipant) => {
      p.videoStreams.forEach((s) => watchStream(p, s));
      p.on("videoStreamsUpdated", (e) => { e.added.forEach((s) => watchStream(p, s)); e.removed.forEach(hideStream); });
      p.on("displayNameChanged", () => refreshPeople(call));
      p.on("isMutedChanged", () => refreshPeople(call));
      try { (p as any).on("isSpeakingChanged", () => refreshPeople(call)); (p as any).on("stateChanged", () => { refreshPeople(call); refreshWaiting(call); }); } catch { /* older SDK */ }
    };

    (async () => {
      try {
        // BF_PORTAL_v890_TEAMS_IDENTITY - a Teams-identity token joins with the Teams call agent (the person's own
        // Teams name, admitted like any colleague); a guest token joins as a named guest through the lobby.
        const credential = new AzureCommunicationTokenCredential(ticket.token);
        const created: CallAgent = ticket.identity === "teams"
          ? (await client.createTeamsCallAgent(credential)) as unknown as CallAgent // same join/call surface for these controls
          : await client.createCallAgent(credential, { displayName: ticket.displayName });
        agent = created;
        const devices = await client.getDeviceManager();
        devicesRef.current = devices;
        const access = await devices.askDevicePermission({ audio: true, video: true });
        if (!access.audio) {
          if (!gone) { setPhase("error"); setMessage("We need your microphone to join. Allow it in your settings, then try again."); }
          return;
        }
        const cameras = access.video ? await devices.getCameras() : [];
        const camera = cameras[0] ? new LocalVideoStream(cameras[0]) : null;
        cameraRef.current = camera;
        if (gone) return;
        const call = created.join({ meetingLink: ticket.joinUrl }, {
          audioOptions: { muted: false },
          ...(camera ? { videoOptions: { localVideoStreams: [camera] } } : {}),
        });
        callRef.current = call;
        setCameraOn(Boolean(camera));
        void showSelf(camera);
        call.on("stateChanged", () => {
          if (gone) return;
          if (call.state === "InLobby") setPhase("lobby");
          else if (call.state === "Connected") setPhase("connected");
          else if (call.state === "Disconnected") {
            setPhase("ended");
            setMessage(endMessage(call.callEndReason?.code, call.callEndReason?.subCode));
          }
        });
        call.on("isMutedChanged", () => { if (!gone) setMuted(call.isMuted); });
        call.on("remoteParticipantsUpdated", (e) => {
          e.added.forEach((p) => watchParticipant(call, p));
          e.removed.forEach((p) => p.videoStreams.forEach(hideStream));
          refreshPeople(call);
        });
        call.remoteParticipants.forEach((p) => watchParticipant(call, p));
        refreshPeople(call);
        // BF_PORTAL_v964_CALL_CONTROLS - everything below is optional; none of it may stop the meeting opening.
        try {
          (call as any).lobby?.on?.("lobbyParticipantsUpdated", () => refreshWaiting(call));
          refreshWaiting(call);
          (call as any).on?.("isScreenSharingOnChanged", () => { if (!gone) setSharing(Boolean((call as any).isScreenSharingOn)); });
          const rec = feat(call, "Recording");
          if (rec) { setRecording(Boolean(rec.isRecordingActive)); rec.on?.("isRecordingActiveChanged", () => { if (!gone) setRecording(Boolean(rec.isRecordingActive)); }); }
          const tr = feat(call, "Transcription");
          if (tr) { setTranscribing(Boolean(tr.isTranscriptionActive)); tr.on?.("isTranscriptionActiveChanged", () => { if (!gone) setTranscribing(Boolean(tr.isTranscriptionActive)); }); }
          const rh = feat(call, "RaiseHand");
          rh?.on?.("raisedHandEvent", () => refreshPeople(call));
          rh?.on?.("loweredHandEvent", () => refreshPeople(call));
          const cap = feat(call, "Captions")?.captions;
          cap?.on?.("CaptionsActiveChanged", () => { if (!gone) setCaptionsOn(Boolean(cap.isCaptionsFeatureActive)); });
          cap?.on?.("CaptionsReceived", (c: any) => {
            if (gone) return;
            setCaptions((prev) => addCaption(prev.lines, String(c?.speaker?.displayName ?? ""), String(c?.captionText ?? c?.spokenText ?? ""), c?.resultType === "Final", prev.partial));
          });
          const toList = (xs: any[]): Device[] => xs.map((d) => ({ id: String(d.id), name: String(d.name || "Device") }));
          const [m, sp] = await Promise.all([devices.getMicrophones?.().catch(() => []) ?? [], devices.isSpeakerSelectionAvailable ? devices.getSpeakers().catch(() => []) : []]);
          rawDevices.current = { mics: m ?? [], speakers: sp ?? [], cams: cameras };
          if (!gone) {
            setMics(toList(m ?? [])); setSpeakers(toList(sp ?? [])); setCams(toList(cameras));
            setChosen({ mic: String(devices.selectedMicrophone?.id ?? m?.[0]?.id ?? ""), speaker: String(devices.selectedSpeaker?.id ?? sp?.[0]?.id ?? ""), cam: String(cameras[0]?.id ?? "") });
          }
        } catch (extra) {
          console.warn("[teams-in-app] some meeting controls are unavailable", extra);
        }
      } catch (err) {
        console.warn("[teams-in-app] join failed", err);
        if (!gone) { setPhase("error"); setMessage("We couldn't connect to the meeting. Use Open in Teams instead."); }
      }
    })();

    return () => {
      gone = true;
      const call = callRef.current;
      if (call && call.state !== "Disconnected") void call.hangUp().catch((): void => undefined);
      renderers.forEach((r) => r.renderer.dispose());
      renderers.clear();
      selfRendererRef.current?.dispose();
      void agent?.dispose().catch((): void => undefined);
      void client.dispose().catch((): void => undefined);
    };
  }, [ticket.token, ticket.displayName, ticket.joinUrl, ticket.identity, showSelf]);

  const toggleMute = async () => {
    const call = callRef.current;
    if (!call) return;
    if (call.isMuted) await call.unmute(); else await call.mute();
    setMuted(call.isMuted);
  };
  const blurEffect = async () => {
    if (!blurRef.current) {
      const m = await import("@azure/communication-calling-effects");
      blurRef.current = new m.BackgroundBlurEffect();
    }
    return blurRef.current as any;
  };
  const toggleBlur = async () => {
    const camera = cameraRef.current as any;
    if (!camera) return;
    try {
      const fx = camera.feature(Features.VideoEffects);
      if (blurOn) { await fx.stopEffects(); setBlurOn(false); }
      else { await fx.startEffects(await blurEffect()); setBlurOn(true); }
    } catch (err) {
      console.warn("[teams-in-app] background blur failed", err);
      setNote("Background blur isn't available on this device.");
    }
  };
  // Check once the camera exists whether blur can run here.
  useEffect(() => {
    const camera = cameraRef.current as any;
    if (!camera || !cameraOn || blurSupported) return;
    let gone = false;
    (async () => {
      try {
        const ok = await camera.feature(Features.VideoEffects).isSupported(await blurEffect());
        if (!gone) setBlurSupported(Boolean(ok));
      } catch { if (!gone) setBlurSupported(false); }
    })();
    return () => { gone = true; };
  }, [cameraOn, blurSupported]);
  const toggleCamera = async () => {
    const call = callRef.current;
    const camera = cameraRef.current;
    if (!call || !camera) return;
    if (cameraOn) { await call.stopVideo(camera); setCameraOn(false); void showSelf(null); }
    else { await call.startVideo(camera); setCameraOn(true); void showSelf(camera); }
  };
  // BF_PORTAL_v964_CALL_CONTROLS
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const attempt = async (what: string, fn: () => Promise<unknown> | unknown) => {
    try { setNote(""); await fn(); }
    catch (err) {
      console.warn("[teams-in-app] " + what + " failed", err);
      setNote(failureNote(what, err));
    }
  };
  const lobbyPerson = (id: string) => (((callRef.current as any)?.lobby?.participants ?? []) as any[]).find((p) => participantId(p.identifier) === id);
  const inPerson = (id: string) => (callRef.current?.remoteParticipants ?? []).find((p) => participantId((p as any).identifier) === id) as any;
  const admit = (id: string) => attempt("let them in", async () => { const p = lobbyPerson(id); if (p) await (callRef.current as any).lobby.admit(p.identifier); });
  const decline = (id: string) => attempt("decline them", async () => { const p = lobbyPerson(id); if (p) await (callRef.current as any).lobby.reject(p.identifier); });
  const admitAll = () => attempt("let everyone in", () => (callRef.current as any)?.lobby?.admitAll());
  const mutePerson = (id: string) => attempt("mute them", () => inPerson(id)?.mute());
  const removePerson = (id: string) => attempt("remove them", async () => { const p = inPerson(id); if (p) await (callRef.current as any).removeParticipant(p.identifier); });
  const muteEveryone = () => attempt("mute everyone", () => (callRef.current as any)?.muteAllRemoteParticipants());
  const toggleShare = () => attempt(sharing ? "stop sharing" : "share your screen", async () => {
    const call = callRef.current as any; if (!call) return;
    if (call.isScreenSharingOn) await call.stopScreenSharing(); else await call.startScreenSharing();
    setSharing(Boolean(call.isScreenSharingOn));
  });
  const toggleHand = () => attempt(hand ? "lower your hand" : "raise your hand", async () => {
    const rh = feat(callRef.current, "RaiseHand"); if (!rh) throw new Error("unavailable");
    if (hand) await rh.lowerHand(); else await rh.raiseHand();
    setHand(!hand);
  });
  const react = (reactionType: string) => attempt("send that reaction", async () => { const r = feat(callRef.current, "Reaction"); if (!r) throw new Error("unavailable"); await r.sendReaction({ reactionType }); });
  const toggleCaptions = () => attempt(captionsOn ? "turn captions off" : "turn captions on", async () => {
    const cap = feat(callRef.current, "Captions")?.captions; if (!cap) throw new Error("unavailable");
    if (captionsOn) { await cap.stopCaptions(); setCaptionsOn(false); setCaptions({ lines: [], partial: null }); }
    else { await cap.startCaptions({ spokenLanguage: "en-us" }); setCaptionsOn(true); }
  });
  const chooseMic = (id: string) => attempt("switch microphone", async () => { const d = rawDevices.current.mics.find((x) => String(x.id) === id); if (d) await devicesRef.current?.selectMicrophone(d); setChosen((c) => ({ ...c, mic: id })); });
  const chooseSpeaker = (id: string) => attempt("switch speaker", async () => { const d = rawDevices.current.speakers.find((x) => String(x.id) === id); if (d) await devicesRef.current?.selectSpeaker(d); setChosen((c) => ({ ...c, speaker: id })); });
  const chooseCam = (id: string) => attempt("switch camera", async () => { const d = rawDevices.current.cams.find((x) => String(x.id) === id); if (d && cameraRef.current) await (cameraRef.current as any).switchSource(d); setChosen((c) => ({ ...c, cam: id })); });
  const copyLink = () => attempt("copy the link", async () => { await navigator.clipboard.writeText(ticket.joinUrl); setNote("Invite link copied."); });

  // BF_PORTAL_v966_MEETING_CHAT - the meeting's Teams chat (staff who joined as themselves only).
  const canChat = ticket.identity === "teams";
  const myTeamsId = ticket.acsUserId.replace(/^teams:/, "");
  const threadId = (): string => { try { return String((callRef.current as any)?.info?.threadId ?? ""); } catch { return ""; } };
  const loadChat = useCallback(async (interactive: boolean) => {
    const thread = threadId();
    if (!thread) return;
    const t = await chatToken(interactive);
    if ("error" in t) {
      if (interactive) { console.warn("[teams-in-app] chat is unavailable", { reason: t.error }); setChatState("blocked"); }
      return;
    }
    chatTokenRef.current = t.token;
    try { setChat(await listChat(thread, t.token, myTeamsId)); setChatState("ready"); }
    catch (err) { console.warn("[teams-in-app] chat could not be read", err); if (interactive) setChatState("blocked"); }
  }, [myTeamsId]);
  const openChat = () => {
    if (panel === "chat") { setPanel(null); return; }
    setPanel("chat");
    if (chatState === "idle" || chatState === "blocked") { setChatState("loading"); void loadChat(true); }
  };
  useEffect(() => { // quiet first look, so new messages are counted before Chat is ever opened
    if (canChat && phase === "connected" && chatState === "idle") void loadChat(false);
  }, [canChat, phase, chatState, loadChat]);
  useEffect(() => {
    if (!canChat || phase !== "connected" || chatState !== "ready") return;
    const t = setInterval(() => void loadChat(false), panel === "chat" ? 4000 : 12000);
    return () => clearInterval(t);
  }, [canChat, phase, chatState, panel, loadChat]);
  useEffect(() => {
    if (panel !== "chat") return;
    setChatSeen(chat.length);
    chatEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [panel, chat.length]);
  const postChat = async () => {
    const text = draft.trim();
    const thread = threadId();
    if (!text || !thread || !chatTokenRef.current) return;
    setDraft("");
    try { await sendChat(thread, chatTokenRef.current, text); await loadChat(false); }
    catch (err) { console.warn("[teams-in-app] chat message was not sent", err); setDraft(text); setNote("Your message wasn't sent. Try again."); }
  };
  const unread = panel === "chat" ? 0 : Math.max(0, chat.length - chatSeen);

  const leave = async () => {
    const call = callRef.current;
    if (call && call.state !== "Disconnected") await call.hangUp().catch((): void => undefined);
    onEnded();
  };

  const status = phase === "starting" ? "Connecting to the meeting..."
    : phase === "lobby" ? (ticket.identity === "guest" // BF_PORTAL_v962_TEAMS_JOIN_AS_YOURSELF
      ? "You're in the lobby because Microsoft didn't sign you in for this meeting, so Teams sees a guest. Leave and press Join meeting again (allow the Microsoft window), or use Open in Teams."
      : "You're in the lobby. Someone in the meeting will let you in soon.")
    : phase === "connected" ? (people.length ? "" : "Waiting for others to join...")
    : message;

  const live = phase === "connected" || phase === "lobby";
  const side: CSSProperties = { width: 300, maxWidth: "85vw", background: "#1b1a19", borderLeft: "1px solid #323130", padding: 12, overflow: "auto", fontSize: 13 };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", color: "#fff" }} data-testid="meeting-room">
      {phase === "connected" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 6px", fontSize: 13, color: "#c8c6c4", flexWrap: "wrap" }} data-testid="meeting-bar">
          <span data-testid="meeting-clock">{clock(seconds)}</span>
          {recording !== null ? (
            <span data-testid="meeting-recording" style={{ color: recording ? "#ff6b6b" : "#c8c6c4", fontWeight: recording ? 700 : 400 }}>
              {recording ? "\u25CF Recording" : "Not recording"}{transcribing ? " and transcribing" : ""}
            </span>
          ) : null}
          {sharing ? <span style={{ color: "#ffd166" }}>You are sharing your screen</span> : null}
          <span style={{ flex: 1 }} />
          <button type="button" style={smallBtn} onClick={() => void copyLink()}>Copy invite link</button>
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative", padding: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {status ? <p data-testid="meeting-status" style={{ margin: "8px 0 12px", fontSize: 15 }}>{status}</p> : null}
        {waiting.length && panel !== "people" ? (
          <p data-testid="meeting-waiting-banner" style={{ margin: "0 0 12px", padding: "8px 12px", background: "#3b3a39", borderRadius: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>{waiting.length === 1 ? waiting[0]!.name + " is waiting to be let in." : waiting.length + " people are waiting to be let in."}</span>
            <button type="button" style={smallBtn} onClick={() => void admitAll()}>Let {waiting.length === 1 ? "them" : "everyone"} in</button>
            <button type="button" style={smallBtn} onClick={() => setPanel("people")}>See who</button>
          </p>
        ) : null}
        {note ? <p role="status" data-testid="meeting-note" style={{ margin: "0 0 12px", color: "#ffd166", fontSize: 13 }}>{note}</p> : null}
        <div ref={gridRef} data-testid="meeting-grid" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gridAutoRows: "minmax(0, 1fr)", gap: 10 }} />
        {people.length ? (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#c8c6c4", flex: "none" }} data-testid="meeting-people">
            In the meeting: {people.map((p) => p.name + (p.muted ? " (muted)" : "") + (p.hand ? " (hand up)" : "")).join(", ")}
          </p>
        ) : null}
        {captionsOn && (captions.lines.length || captions.partial) ? (
          <div data-testid="meeting-captions" aria-live="polite" style={{ position: "absolute", left: 16, right: 180, bottom: 12, background: "rgba(0,0,0,.7)", borderRadius: 8, padding: "8px 12px", fontSize: 15, lineHeight: 1.4 }}>
            {[...captions.lines, ...(captions.partial ? [captions.partial] : [])].map((c, i) => <div key={i}><strong>{c.who}:</strong> {c.text}</div>)}
          </div>
        ) : null}
        <div ref={selfRef} aria-label="Your video" style={{ position: "absolute", right: 16, bottom: 16, width: 150, height: 110, borderRadius: 10, overflow: "hidden", background: "#000", display: cameraOn ? "block" : "none" }} />
      </div>
      {panel === "people" ? (
        <aside style={side} data-testid="meeting-people-panel" aria-label="People">
          {waiting.length ? (
            <>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <strong style={{ flex: 1 }}>Waiting ({waiting.length})</strong>
                <button type="button" style={smallBtn} onClick={() => void admitAll()}>Let everyone in</button>
              </div>
              {waiting.map((w) => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }} data-testid="meeting-waiting">
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</span>
                  <button type="button" style={smallBtn} onClick={() => void admit(w.id)} aria-label={"Let " + w.name + " in"}>Let in</button>
                  <button type="button" style={smallBtn} onClick={() => void decline(w.id)} aria-label={"Decline " + w.name}>Decline</button>
                </div>
              ))}
              <hr style={{ borderColor: "#323130", margin: "10px 0" }} />
            </>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <strong style={{ flex: 1 }}>In the meeting ({people.length + 1})</strong>
            {people.length ? <button type="button" style={smallBtn} onClick={() => void muteEveryone()}>Mute everyone</button> : null}
          </div>
          <div style={{ padding: "6px 0", color: "#c8c6c4" }}>You{muted ? " (muted)" : ""}{hand ? " (hand up)" : ""}</div>
          {people.map((p) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }} data-testid="meeting-person">
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontWeight: p.speaking ? 700 : 400 }}>
                {p.name}{p.muted ? " (muted)" : ""}{p.hand ? " (hand up)" : ""}{p.speaking ? " - speaking" : ""}
              </span>
              {p.id && !p.muted ? <button type="button" style={smallBtn} onClick={() => void mutePerson(p.id!)} aria-label={"Mute " + p.name}>Mute</button> : null}
              {p.id ? <button type="button" style={smallBtn} onClick={() => void removePerson(p.id!)} aria-label={"Remove " + p.name}>Remove</button> : null}
            </div>
          ))}
        </aside>
      ) : null}
      {panel === "chat" ? (
        <aside style={{ ...side, display: "flex", flexDirection: "column", overflow: "hidden" }} data-testid="meeting-chat-panel" aria-label="Chat">
          <strong style={{ marginBottom: 8 }}>Meeting chat</strong>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {chatState === "loading" ? <p style={{ color: "#c8c6c4" }}>Opening the chat...</p> : null}
            {chatState === "blocked" ? <p style={{ color: "#ffd166" }} data-testid="meeting-chat-blocked">Microsoft didn't open the chat for this meeting. Close this panel and press Chat again, and allow the Microsoft window if one appears.</p> : null}
            {chatState === "ready" && !chat.length ? <p style={{ color: "#c8c6c4" }}>No messages yet.</p> : null}
            {chat.map((m) => (
              <div key={m.id} data-testid="meeting-chat-message" style={{ margin: "0 0 10px", textAlign: m.mine ? "right" : "left" }}>
                <div style={{ fontSize: 11, color: "#a19f9d" }}>{m.mine ? "You" : m.from}</div>
                <div style={{ display: "inline-block", maxWidth: "100%", padding: "6px 10px", borderRadius: 8, background: m.mine ? "#4f52b2" : "#323130", whiteSpace: "pre-wrap", overflowWrap: "anywhere", textAlign: "left" }}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void postChat(); }} style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message" aria-label="Message" disabled={chatState !== "ready"} style={{ ...selectStyle, flex: 1 }} />
            <button type="submit" style={smallBtn} disabled={chatState !== "ready" || !draft.trim()}>Send</button>
          </form>
        </aside>
      ) : null}
      {panel === "devices" ? (
        <aside style={side} data-testid="meeting-devices-panel" aria-label="Devices">
          <label style={{ display: "block", marginBottom: 12 }}>Microphone
            <select style={selectStyle} value={chosen.mic} onChange={(e) => void chooseMic(e.target.value)} data-testid="meeting-mic">
              {mics.length ? mics.map((d) => <option key={d.id} value={d.id}>{d.name}</option>) : <option value="">Default microphone</option>}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>Speaker
            <select style={selectStyle} value={chosen.speaker} onChange={(e) => void chooseSpeaker(e.target.value)} data-testid="meeting-speaker" disabled={!speakers.length}>
              {speakers.length ? speakers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>) : <option value="">Set by this device</option>}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>Camera
            <select style={selectStyle} value={chosen.cam} onChange={(e) => void chooseCam(e.target.value)} data-testid="meeting-cam" disabled={!cams.length}>
              {cams.length ? cams.map((d) => <option key={d.id} value={d.id}>{d.name}</option>) : <option value="">No camera found</option>}
            </select>
          </label>
          <p style={{ color: "#c8c6c4", margin: 0 }}>Recording is started and stopped by Teams, not from here. Meetings booked in the portal are set to record and transcribe automatically.</p>
        </aside>
      ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "12px 12px 16px", flexWrap: "wrap" }}>
        {phase === "ended" || phase === "error" ? (
          <button type="button" style={btn(true)} onClick={onEnded}>Close</button>
        ) : (
          <>
            <button type="button" style={btn(!muted)} onClick={() => void toggleMute()} aria-pressed={muted} disabled={phase === "starting"}>{muted ? "Unmute" : "Mute"}</button>
            <button type="button" style={btn(cameraOn)} onClick={() => void toggleCamera()} aria-pressed={cameraOn} disabled={phase === "starting" || !cameraRef.current}>{cameraOn ? "Camera off" : "Camera on"}</button>
            {blurSupported && cameraOn ? <button type="button" style={btn(blurOn)} onClick={() => void toggleBlur()} aria-pressed={blurOn} data-testid="meeting-blur-button">{blurOn ? "Blur off" : "Blur background"}</button> : null}
            {live ? (
              <>
                {screenShareSupported() ? <button type="button" style={btn(sharing)} onClick={() => void toggleShare()} aria-pressed={sharing} disabled={phase !== "connected"}>{sharing ? "Stop sharing" : "Share screen"}</button> : null}
                <button type="button" style={btn(hand)} onClick={() => void toggleHand()} aria-pressed={hand} disabled={phase !== "connected"}>{hand ? "Lower hand" : "Raise hand"}</button>
                <button type="button" style={btn(false)} onClick={() => void react("like")} disabled={phase !== "connected"} aria-label="Send a thumbs up">{"\uD83D\uDC4D"}</button>
                <button type="button" style={btn(false)} onClick={() => void react("applause")} disabled={phase !== "connected"} aria-label="Send applause">{"\uD83D\uDC4F"}</button>
                <button type="button" style={btn(captionsOn)} onClick={() => void toggleCaptions()} aria-pressed={captionsOn} disabled={phase !== "connected"}>{captionsOn ? "Captions off" : "Captions"}</button>
                <button type="button" style={btn(panel === "people")} onClick={() => setPanel(panel === "people" ? null : "people")} aria-pressed={panel === "people"} data-testid="meeting-people-button">
                  People ({people.length + 1}){waiting.length ? " - " + waiting.length + " waiting" : ""}
                </button>
                {canChat ? <button type="button" style={btn(panel === "chat")} onClick={openChat} aria-pressed={panel === "chat"} disabled={phase !== "connected"} data-testid="meeting-chat-button">Chat{unread ? " (" + unread + " new)" : ""}</button> : null}
                <button type="button" style={btn(panel === "devices")} onClick={() => setPanel(panel === "devices" ? null : "devices")} aria-pressed={panel === "devices"}>Devices</button>
              </>
            ) : null}
            <button type="button" style={btn(false, true)} onClick={() => void leave()}>Leave</button>
          </>
        )}
      </div>
    </div>
  );
}
