import { useEffect, useRef, useState, type CSSProperties } from "react";
import { sendMayaMessage, escalateToHuman, reportPortalIssue } from "@/api/maya";

type Msg = { role: "user" | "maya"; text: string; ts: number };

const GREETING = "👋 Hi, I'm Maya. How can I help you today?";

export default function MayaChat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "maya", text: GREETING, ts: Date.now() }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === "function") {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [msgs]);

  async function send() {
    const userText = input.trim();
    if (!userText || sending) return;
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: userText, ts: Date.now() }]);
    setSending(true);
    try {
      const result = (await sendMayaMessage(userText)) as unknown;
      const replyText: string = extractReplyText(result);
      setMsgs((p) => [...p, { role: "maya", text: replyText, ts: Date.now() }]);
    } catch {
      setMsgs((p) => [
        ...p,
        {
          role: "maya",
          text: "I'm having trouble right now — want me to connect you to a human?",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function extractReplyText(value: unknown): string {
    if (typeof value === "string") return value || "I'm here.";
    if (value && typeof value === "object") {
      const v = value as Record<string, unknown>;
      const candidate = v.reply ?? v.message ?? v.response ?? v.text;
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    return "I'm here.";
  }

  async function escalate() {
    try {
      await escalateToHuman();
      setMsgs((p) => [...p, { role: "maya", text: "✓ A team member has been notified.", ts: Date.now() }]);
    } catch {
      setMsgs((p) => [...p, { role: "maya", text: "Couldn't reach the team. Please try again.", ts: Date.now() }]);
    }
  }

  async function report() {
    const message = reportText.trim();
    if (!message) return;
    try {
      await reportPortalIssue({ message });
      setMsgs((p) => [...p, { role: "maya", text: "✓ Thanks — we got your report.", ts: Date.now() }]);
    } catch {
      setMsgs((p) => [...p, { role: "maya", text: "Report failed. Please try again.", ts: Date.now() }]);
    } finally {
      setReportOpen(false);
      setReportText("");
    }
  }

  return (
    <div style={panelStyle} role="dialog" aria-label="Maya assistant">
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>Maya</span>
      </div>

      <div ref={scrollRef} style={listStyle}>
        {msgs.map((m) => (
          <div key={m.ts} style={bubbleStyle(m.role)}>{m.text}</div>
        ))}
      </div>

      {reportOpen && (
        <div style={reportBoxStyle}>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={3}
            placeholder="Describe the issue…"
            style={textareaStyle}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button onClick={() => setReportOpen(false)} style={ghostBtn}>Cancel</button>
            <button onClick={report} disabled={!reportText.trim()} style={primaryBtn}>Send</button>
          </div>
        </div>
      )}

      <div style={composerStyle}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !sending) void send(); }}
            placeholder="Ask Maya anything…"
            disabled={sending}
            style={inputStyle}
          />
          <button onClick={() => void send()} disabled={!input.trim() || sending} style={primaryBtn}>
            {sending ? "…" : "Send"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <button onClick={escalate} style={ghostBtnBlue}>Talk to Human</button>
          <button onClick={() => setReportOpen((p) => !p)} style={ghostBtnRed}>Report Issue</button>
        </div>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  width: "100%", maxWidth: 360, minHeight: 360, maxHeight: 520,
  background: "#fff", color: "#000", borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  display: "flex", flexDirection: "column",
  border: "1px solid #e2e8f0",
};
const headerStyle: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: 12, borderBottom: "1px solid #e2e8f0",
};
const listStyle: CSSProperties = {
  flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8,
};
const bubbleStyle = (role: "user" | "maya"): CSSProperties => ({
  alignSelf: role === "user" ? "flex-end" : "flex-start",
  background: role === "user" ? "#2563eb" : "#f1f5f9",
  color: role === "user" ? "#fff" : "#000",
  padding: "8px 12px", borderRadius: 12, maxWidth: "85%", whiteSpace: "pre-wrap", lineHeight: 1.4,
});
const composerStyle: CSSProperties = { padding: 12, borderTop: "1px solid #e2e8f0" };
const inputStyle: CSSProperties = {
  flex: 1, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, color: "#000", background: "#fff",
};
const textareaStyle: CSSProperties = {
  width: "100%", padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, color: "#000", background: "#fff",
};
const primaryBtn: CSSProperties = {
  background: "#2563eb", color: "#fff", border: "none",
  padding: "8px 16px", borderRadius: 4, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "#fff", color: "#000", border: "1px solid #cbd6e2",
  padding: "8px 16px", borderRadius: 4, cursor: "pointer",
};
const ghostBtnBlue: CSSProperties = {
  background: "#fff", color: "#2563eb", border: "1px solid #2563eb",
  padding: "8px", borderRadius: 4, cursor: "pointer",
};
const ghostBtnRed: CSSProperties = {
  background: "#fff", color: "#dc2626", border: "1px solid #dc2626",
  padding: "8px", borderRadius: 4, cursor: "pointer",
};
const reportBoxStyle: CSSProperties = { padding: 12, borderTop: "1px solid #e2e8f0" };
