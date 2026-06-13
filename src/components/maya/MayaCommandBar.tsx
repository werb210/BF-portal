// BF_PORTAL_MAYA_COMMAND_BAR — screen-aware Maya trigger for staff.
// A floating button (and optional voice dictation) that captures a
// spoken or typed command, attaches the current screen context (parsed
// from the pathname, since this lives above the route tree so useParams
// is empty), sends it to Maya with audience=staff, and executes any
// navigate actions Maya returns ("open the newest application", "open
// this contact", "go to the pipeline").
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendMayaMessage, type MayaAction } from "@/api/maya";
import { startCall } from "@/api/call";

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}
function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function siloFromPath(pathname: string): string {
  return pathname.startsWith("/silo/bi/") ? "bi" : "bf";
}

function buildScreenContext(pathname: string): Record<string, unknown> {
  const ctx: Record<string, unknown> = { pathname, silo: siloFromPath(pathname) };
  let m: RegExpMatchArray | null;
  if ((m = pathname.match(/^\/applications\/([^/]+)/))) {
    ctx.entity = "application";
    ctx.id = m[1] ?? "";
  } else if ((m = pathname.match(/^\/silo\/bi\/pipeline\/([^/]+)/))) {
    ctx.entity = "application";
    ctx.id = m[1] ?? "";
  } else if ((m = pathname.match(/^\/(?:silo\/bi\/)?crm\/contacts\/([^/]+)/))) {
    ctx.entity = "contact";
    ctx.id = m[1] ?? "";
  } else if ((m = pathname.match(/^\/(?:silo\/bi\/)?crm\/companies\/([^/]+)/))) {
    ctx.entity = "company";
    ctx.id = m[1] ?? "";
  } else if (/\/crm\/contacts/.test(pathname)) {
    ctx.entity = "contacts";
  } else if (/\/crm\/companies/.test(pathname)) {
    ctx.entity = "companies";
  } else if (/pipeline/.test(pathname)) {
    ctx.entity = "pipeline";
  } else if (/applications/.test(pathname)) {
    ctx.entity = "applications";
  }
  return ctx;
}

function actionToPath(a: MayaAction): string | null {
  const id = a.id ? encodeURIComponent(a.id) : "";
  switch (a.target) {
    case "application":
      return id ? `/applications/${id}` : "/pipeline";
    case "contact":
      return id ? `/crm/contacts/${id}` : "/crm/contacts";
    case "company":
      return id ? `/crm/companies/${id}` : "/crm/contacts";
    case "pipeline":
    case "applications":
      return "/pipeline";
    case "contacts":
      return "/crm/contacts";
    case "companies":
      return "/crm/contacts";
    case "path":
      return a.path && a.path.startsWith("/") ? a.path : null;
    default:
      return null;
  }
}

export default function MayaCommandBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const run = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd || busy) return;
      setBusy(true);
      setReply(null);
      try {
        const ctx = buildScreenContext(window.location.pathname);
        const res = await sendMayaMessage(cmd, ctx);
        setReply(typeof res.reply === "string" ? res.reply : "Done.");
        const actions = Array.isArray(res.actions) ? res.actions : [];
        for (const a of actions) {
          if (a?.type === "navigate") {
            const path = actionToPath(a);
            if (path) {
              navigate(path);
              break;
            }
          }
          if (a?.type === "dial") {
            const to = typeof a.to === "string" ? a.to : "";
            if (to) {
              void startCall(to);
              break;
            }
          }
        }
        setText("");
      } catch {
        setReply("Sorry — I couldn't reach Maya just now.");
      } finally {
        setBusy(false);
      }
    },
    [busy, navigate],
  );

  const startDictation = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setReply("Voice input isn't supported in this browser — type your command.");
      return;
    }
    const recog = new Ctor();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onresult = (e: SpeechResultEvent) => {
      const transcript = e?.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setText(transcript);
        void run(transcript);
      }
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    setListening(true);
    try {
      recog.start();
    } catch {
      setListening(false);
    }
  }, [run]);

  const stopDictation = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 2147482000 }}>
      {open && (
        <div
          style={{
            width: 320,
            marginBottom: 10,
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
            Ask Maya — e.g. “open the newest application”, “open this contact”, “go to the pipeline”.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run(text);
              }}
              placeholder="Type a command…"
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#e2e8f0",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={() => (listening ? stopDictation() : startDictation())}
              title={listening ? "Stop" : "Speak"}
              style={{
                width: 38,
                borderRadius: 8,
                border: "1px solid #334155",
                background: listening ? "#dc2626" : "#1e293b",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              {listening ? "■" : "🎙"}
            </button>
            <button
              type="button"
              onClick={() => void run(text)}
              disabled={busy}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "…" : "Go"}
            </button>
          </div>
          {reply && (
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>{reply}</div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Maya command"
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          border: "none",
          background: "#2563eb",
          color: "#fff",
          fontSize: 20,
          boxShadow: "0 6px 18px rgba(37,99,235,0.45)",
          cursor: "pointer",
        }}
      >
        {open ? "×" : "✦"}
      </button>
    </div>
  );
}
