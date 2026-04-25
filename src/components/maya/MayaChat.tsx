/**
 * Maya in-portal chat widget.
 * Embedded in AppLayout's MAYA sidebar slot.
 * - Greeting on first render
 * - Chat input + reply (POST /api/ai/maya/message)
 * - Talk to Human button (POST /api/maya/escalate)
 * - Report Issue button (POST /api/client/issues)
 */
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/http";
import { sendMayaMessage, escalateToHuman, reportPortalIssue } from "@/api/maya";

type Message = { role: "user" | "maya"; text: string; ts: number };

const GREETING = "Hi, I'm Maya. How can I help with your work today?";

export default function MayaChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "maya", text: GREETING, ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    },
    [],
  );
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function flash(msg: string) {
    setConfirm(msg);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirm(null), 4000);
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setSending(true);
    try {
      const res = await sendMayaMessage(text);
      const reply =
        typeof (res as any)?.reply === "string"
          ? (res as any).reply
          : typeof (res as any)?.message === "string"
            ? (res as any).message
            : typeof (res as any)?.response === "string"
              ? (res as any).response
              : "I'm here to help — what would you like to know?";
      setMessages((prev) => [...prev, { role: "maya", text: reply, ts: Date.now() }]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) return;
      setMessages((prev) => [
        ...prev,
        {
          role: "maya",
          text: "I'm having trouble connecting right now. Please try again.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleTalkToHuman() {
    try {
      await escalateToHuman();
      flash("✓ A team member has been notified.");
    } catch {
      flash("Could not escalate right now.");
    }
  }

  async function handleReport() {
    const msg = reportText.trim();
    if (!msg) return;
    let screenshot: string | undefined;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body);
      screenshot = canvas.toDataURL("image/png");
    } catch {
      // text-only fallback
    }
    try {
      await reportPortalIssue({ message: msg, screenshotBase64: screenshot });
      flash("✓ Thanks — your report was sent.");
      setReportText("");
      setReportOpen(false);
    } catch {
      flash("Report failed. Please try again.");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "4px 2px",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.ts}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "rgba(255,255,255,0.08)",
              color: "#fff",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "6px 10px",
              fontSize: 12,
              maxWidth: "90%",
              lineHeight: 1.4,
            }}
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.08)",
              color: "var(--ui-text-muted)",
              borderRadius: "12px 12px 12px 2px",
              padding: "6px 10px",
              fontSize: 12,
            }}
          >
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask Maya anything…"
          disabled={sending}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 10px",
            color: "#fff",
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          style={{
            background: "#2563eb",
            border: "none",
            borderRadius: 8,
            padding: "6px 10px",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            opacity: !input.trim() || sending ? 0.5 : 1,
          }}
        >
          ↑
        </button>
      </div>

      {confirm && (
        <div
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11,
            color: "#86efac",
            background: "rgba(34,197,94,0.15)",
          }}
        >
          {confirm}
        </div>
      )}

      {reportOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 6,
          }}
        >
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Describe the issue"
            rows={3}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: 6,
              color: "#fff",
              fontSize: 12,
              resize: "none",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setReportOpen(false);
                setReportText("");
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "var(--ui-text-muted)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleReport()}
              disabled={!reportText.trim()}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                cursor: "pointer",
                fontSize: 11,
                opacity: reportText.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <button
          onClick={() => void handleTalkToHuman()}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #2563eb",
            background: "rgba(37,99,235,0.15)",
            color: "#93c5fd",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Talk to Human
        </button>
        <button
          onClick={() => setReportOpen((p) => !p)}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #dc2626",
            background: "rgba(220,38,38,0.15)",
            color: "#fca5a5",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Report Issue
        </button>
      </div>
    </div>
  );
}
