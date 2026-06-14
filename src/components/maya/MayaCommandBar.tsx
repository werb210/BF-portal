// MAYA_COMMAND_BAR — inline sidebar command bar. Input on top, mic + Go
// below so it fits the narrow nav column. Screen-aware: attaches the
// current screen context and executes Maya's navigate / dial actions.
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendMayaMessage, type MayaAction } from "@/api/maya";
import { startCall } from "@/api/call";
import { getAuthToken } from "@/lib/authToken";
import { resolveApiBase } from "@/config/api";

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}
function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
function siloFromPath(p: string): string { return p.startsWith("/silo/bi/") ? "bi" : "bf"; }
function buildScreenContext(pathname: string): Record<string, unknown> {
  const ctx: Record<string, unknown> = { pathname, silo: siloFromPath(pathname) };
  let m: RegExpMatchArray | null;
  if ((m = pathname.match(/^\/applications\/([^/]+)/))) { ctx.entity = "application"; ctx.id = m[1] ?? ""; }
  else if ((m = pathname.match(/^\/silo\/bi\/pipeline\/([^/]+)/))) { ctx.entity = "application"; ctx.id = m[1] ?? ""; }
  else if ((m = pathname.match(/^\/(?:silo\/bi\/)?crm\/contacts\/([^/]+)/))) { ctx.entity = "contact"; ctx.id = m[1] ?? ""; }
  else if ((m = pathname.match(/^\/(?:silo\/bi\/)?crm\/companies\/([^/]+)/))) { ctx.entity = "company"; ctx.id = m[1] ?? ""; }
  else if (/\/crm\/contacts/.test(pathname)) ctx.entity = "contacts";
  else if (/\/crm\/companies/.test(pathname)) ctx.entity = "companies";
  else if (/pipeline/.test(pathname)) ctx.entity = "pipeline";
  else if (/applications/.test(pathname)) ctx.entity = "applications";
  return ctx;
}
function actionToPath(a: MayaAction): string | null {
  const id = a.id ? encodeURIComponent(a.id) : "";
  switch (a.target) {
    case "application": return id ? `/applications/${id}` : "/pipeline";
    case "contact": return id ? `/crm/contacts/${id}` : "/crm/contacts";
    case "company": return id ? `/crm/companies/${id}` : "/crm/contacts";
    case "pipeline": case "applications": return "/pipeline";
    case "contacts": return "/crm/contacts";
    case "companies": return "/crm/contacts";
    case "path": return a.path && a.path.startsWith("/") ? a.path : null;
    default: return null;
  }
}

export default function MayaCommandBar() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  // MAYA_VOICE_OUTPUT_v1 — speak Maya's reply via BF-Server /api/settings/maya-tts
  // (nova by default). Best-effort: any failure is silent and never blocks the
  // text reply. Triggered from a user gesture (Go / mic) so autoplay is allowed.
  const speak = useCallback(async (textToSpeak: string) => {
    if (muted || !textToSpeak.trim()) return;
    try {
      const path = "/api/settings/maya-tts";
      const base = resolveApiBase(path);
      const token = getAuthToken();
      const resp = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: textToSpeak.slice(0, 1000) }),
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      try { audioRef.current?.pause(); } catch { /* noop */ }
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      void audio.play();
    } catch {
      /* voice is best-effort */
    }
  }, [muted]);

  const run = useCallback(async (command: string) => {
    const cmd = command.trim();
    if (!cmd || busy) return;
    setBusy(true); setReply(null);
    try {
      const ctx = buildScreenContext(window.location.pathname);
      const res = await sendMayaMessage(cmd, ctx);
      const replyText = typeof res.reply === "string" ? res.reply : "Done.";
      setReply(replyText);
      void speak(replyText);
      const actions = Array.isArray(res.actions) ? res.actions : [];
      for (const a of actions) {
        if (a?.type === "navigate") {
          const path = actionToPath(a);
          if (path) { navigate(path); break; }
        }
        if (a?.type === "dial") {
          const to = typeof a.to === "string" ? a.to : "";
          if (to) { void startCall(to); break; }
        }
      }
      setText("");
    } catch { setReply("Sorry — I couldn't reach Maya just now."); }
    finally { setBusy(false); }
  }, [busy, navigate, speak]);

  const startDictation = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setReply("Voice input isn't supported in this browser — type your command."); return; }
    const recog = new Ctor();
    recog.continuous = false; recog.interimResults = false; recog.lang = "en-US";
    recog.onresult = (e: SpeechResultEvent) => {
      const transcript = e?.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) { setText(transcript); void run(transcript); }
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog; setListening(true);
    try { recog.start(); } catch { setListening(false); }
  }, [run]);
  const stopDictation = useCallback(() => { try { recogRef.current?.stop(); } catch { /* noop */ } setListening(false); }, []);

  useEffect(() => () => { try { recogRef.current?.stop(); } catch { /* noop */ } try { audioRef.current?.pause(); } catch { /* noop */ } }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
      <div style={{ fontSize: 11, color: "var(--ui-text-muted)", lineHeight: 1.4 }}>
        Ask Maya — e.g. “open the newest application”, “open this contact”, “call this client”.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void run(text); } }}
        placeholder="Type a command…"
        rows={2}
        style={{
          width: "100%", resize: "none", boxSizing: "border-box",
          background: "#ffffff", color: "#0f172a",
          border: "1px solid #cbd6e2", borderRadius: 8, padding: "8px 10px",
          fontSize: 13, fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => (listening ? stopDictation() : startDictation())}
          title={listening ? "Stop" : "Speak"}
          style={{
            width: 40, height: 34, borderRadius: 8,
            border: "1px solid #cbd6e2",
            background: listening ? "#dc2626" : "#f1f5f9",
            color: listening ? "#fff" : "#0f172a", cursor: "pointer",
          }}
        >
          {listening ? "■" : "🎙"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMuted((m) => {
              if (!m) { try { audioRef.current?.pause(); } catch { /* noop */ } }
              return !m;
            });
          }}
          title={muted ? "Maya voice off — tap to turn on" : "Maya voice on — tap to mute"}
          style={{
            width: 40, height: 34, borderRadius: 8,
            border: "1px solid #cbd6e2",
            background: muted ? "#f1f5f9" : "#dbeafe",
            color: "#0f172a", cursor: "pointer",
          }}
        >
          {muted ? "\u{1F507}" : "\u{1F50A}"}
        </button>
        <button
          type="button"
          onClick={() => void run(text)}
          disabled={busy || !text.trim()}
          style={{
            flex: 1, height: 34, borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff",
            cursor: busy || !text.trim() ? "default" : "pointer",
            opacity: busy || !text.trim() ? 0.6 : 1, fontWeight: 600,
          }}
        >
          {busy ? "…" : "Go"}
        </button>
      </div>
      {reply && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ui-text)", maxHeight: 160, overflowY: "auto", borderTop: "1px solid var(--ui-border)", paddingTop: 8 }}>
          {reply}
        </div>
      )}
    </div>
  );
}
