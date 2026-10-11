// BF_PORTAL_AI_PAGE_v784 - the old page joined a WebSocket (/api/ai/ws) and
// read /api/ai/session/:id and /api/ai/close, none of which exist, and its
// route redirected to itself. It now lists recent Maya conversations with a
// read-only transcript, and offers a staff AI chat backed by
// /api/ai/ai/start, /api/ai/ai/message and /api/ai/ai/close.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type MayaSession = {
  id: string;
  source?: string | null;
  channel?: string | null;
  status?: string | null;
  message_count?: number | null;
  last_message_at?: string | null;
  last_message?: string | null;
};

type MayaMessage = { id?: string; role: string; message?: string; content?: string; created_at?: string };

type ChatLine = { role: "user" | "ai"; content: string };

const ERROR_COLOR = "#B91C1C";

function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message !== "API_ERROR") return `${fallback}: ${error.message}`;
  return fallback;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function readSessionId(res: any): string | null {
  return pickString(res?.sessionId, res?.session_id, res?.id, res?.session?.id, res?.data?.sessionId, res?.data?.id);
}

function readReply(res: any): string | null {
  return pickString(
    res?.reply,
    res?.response,
    res?.answer,
    res?.content,
    res?.message?.content,
    res?.message?.message,
    typeof res?.message === "string" ? res.message : null,
    res?.data?.reply,
    res?.data?.content,
  );
}

function roleLabel(role: string): string {
  if (role === "user") return "Visitor";
  if (role === "ai" || role === "assistant") return "Maya";
  return role;
}

export default function AiLiveChat() {
  const [sessions, setSessions] = useState<MayaSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<MayaMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSessionsLoading(true);
    api<{ sessions?: MayaSession[] } | MayaSession[]>("/api/communications/maya-sessions")
      .then((res) => {
        if (!alive) return;
        setSessions(Array.isArray(res) ? res : res?.sessions ?? []);
        setSessionsError(null);
      })
      .catch((error) => {
        if (alive) setSessionsError(errorText(error, "Could not load Maya conversations"));
      })
      .finally(() => {
        if (alive) setSessionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setTranscript([]);
      return;
    }
    let alive = true;
    setTranscriptLoading(true);
    setTranscriptError(null);
    api<{ messages?: MayaMessage[] } | MayaMessage[]>(`/api/communications/maya-sessions/${encodeURIComponent(selected)}/messages`)
      .then((res) => {
        if (alive) setTranscript(Array.isArray(res) ? res : res?.messages ?? []);
      })
      .catch((error) => {
        if (alive) {
          setTranscript([]);
          setTranscriptError(errorText(error, "Could not load this conversation"));
        }
      })
      .finally(() => {
        if (alive) setTranscriptLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected]);

  const ensureChatSession = useCallback(async (): Promise<string> => {
    if (chatSessionId) return chatSessionId;
    const res = await api.post("/api/ai/ai/start", { source: "staff_portal" });
    const id = readSessionId(res);
    if (!id) throw new Error("No session id returned");
    setChatSessionId(id);
    return id;
  }, [chatSessionId]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setChatError(null);
    setChat((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    try {
      const sessionId = await ensureChatSession();
      const res = await api.post("/api/ai/ai/message", { sessionId, message: text });
      const reply = readReply(res);
      if (reply) setChat((prev) => [...prev, { role: "ai", content: reply }]);
    } catch (error) {
      setChatError(errorText(error, "Maya could not reply"));
    } finally {
      setBusy(false);
    }
  }

  async function closeChat() {
    if (!chatSessionId) {
      setChat([]);
      return;
    }
    setBusy(true);
    setChatError(null);
    try {
      await api.post("/api/ai/ai/close", { sessionId: chatSessionId });
      setChatSessionId(null);
      setChat([]);
    } catch (error) {
      setChatError(errorText(error, "Could not close the chat"));
    } finally {
      setBusy(false);
    }
  }

  const panel: CSSProperties = {
    border: "1px solid var(--ui-border)",
    borderRadius: 12,
    background: "var(--ui-surface-strong)",
    color: "var(--ui-text)",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, gridTemplateColumns: "minmax(260px, 320px) 1fr", height: "80vh", color: "var(--ui-text)" }}>
      <section style={panel} aria-label="Recent Maya conversations">
        <h2 style={{ margin: 0, padding: "12px 14px", fontSize: 16, borderBottom: "1px solid var(--ui-border)" }}>Recent Maya conversations</h2>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {sessionsLoading ? (
            <p style={{ padding: 14, margin: 0, color: "var(--ui-text-muted)" }}>Loading...</p>
          ) : sessionsError ? (
            <p role="alert" style={{ padding: 14, margin: 0, color: ERROR_COLOR, background: "#FEF2F2" }}>{sessionsError}</p>
          ) : sessions.length === 0 ? (
            <p style={{ padding: 14, margin: 0, color: "var(--ui-text-muted)" }}>No Maya conversations yet.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                aria-pressed={selected === s.id}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: 0,
                  borderBottom: "1px solid var(--ui-border-soft)",
                  background: selected === s.id ? "var(--ui-surface-muted)" : "transparent",
                  color: "var(--ui-text)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {s.source || "Maya chat"}
                  {s.status ? ` - ${s.status}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.last_message || `${s.message_count ?? 0} messages`}
                </div>
                {s.last_message_at ? (
                  <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{new Date(s.last_message_at).toLocaleString()}</div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16, minHeight: 0 }}>
        <section style={panel} aria-label="Transcript">
          <h2 style={{ margin: 0, padding: "12px 14px", fontSize: 16, borderBottom: "1px solid var(--ui-border)" }}>Transcript</h2>
          <div style={{ overflowY: "auto", flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {!selected ? (
              <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>Select a conversation to read it.</p>
            ) : transcriptLoading ? (
              <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>Loading...</p>
            ) : transcriptError ? (
              <p role="alert" style={{ margin: 0, color: ERROR_COLOR, background: "#FEF2F2", padding: 8, borderRadius: 8 }}>{transcriptError}</p>
            ) : transcript.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>No messages in this conversation.</p>
            ) : (
              transcript.map((m, i) => (
                <div key={m.id ?? `${m.role}-${i}`}>
                  <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{roleLabel(m.role)}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.message ?? m.content ?? ""}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={panel} aria-label="Ask Maya">
          <h2 style={{ margin: 0, padding: "12px 14px", fontSize: 16, borderBottom: "1px solid var(--ui-border)" }}>Ask Maya</h2>
          <div style={{ overflowY: "auto", flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {chat.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>Start a conversation with Maya.</p>
            ) : (
              chat.map((line, i) => (
                <div key={`${line.role}-${i}`} style={{ textAlign: line.role === "user" ? "right" : "left" }}>
                  <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{line.role === "user" ? "You" : "Maya"}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{line.content}</div>
                </div>
              ))
            )}
            {chatError ? (
              <p role="alert" style={{ margin: 0, color: ERROR_COLOR, background: "#FEF2F2", padding: 8, borderRadius: 8 }}>{chatError}</p>
            ) : null}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--ui-border)" }}
          >
            <input
              aria-label="Message Maya"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Maya..."
              style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-input)", color: "var(--ui-text)" }}
            />
            <button type="submit" disabled={busy || !input.trim()} style={{ borderRadius: 8, padding: "0 16px", background: "#1D4ED8", color: "#fff", border: 0 }}>
              Send
            </button>
            <button type="button" onClick={() => void closeChat()} disabled={busy} style={{ borderRadius: 8, padding: "0 16px", background: "#B91C1C", color: "#fff", border: 0 }}>
              Close
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
