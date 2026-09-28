// BF_PORTAL_TEAM_PHASE_B_v661 - a thread in a side panel: the original message, every reply,
// and a reply box (with formatting and emoji). Replies arrive live over the Team socket.
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import FullEmojiPicker from "./FullEmojiPicker";
import { FormatBar, renderTeamText } from "./teamFormat";

export type ThreadMessage = { id: string; channel_id: string; sender_id: string | null; body: string; created_at: string; deleted_at?: string | null; edited_at?: string | null; attachments?: Array<{ name: string; contentType: string; dataUrl: string }> | null; thread_root_id?: string | null };
export type ThreadSummary = { reply_count: number; last_reply_at: string | null; participant_ids: string[] };
export type ThreadEvent = { root_id: string; message: ThreadMessage; summary: ThreadSummary; seq: number };

export default function ThreadPanel({ channelId, rootId, nameOf, memberNames, myId, live, onClose, onSummary, disabled }: {
  channelId: string; rootId: string; nameOf: (id: string | null) => string; memberNames: string[]; myId: string | null;
  live: ThreadEvent | null; onClose: () => void; onSummary: (rootId: string, summary: ThreadSummary) => void; disabled?: boolean;
}) {
  const [root, setRoot] = useState<ThreadMessage | null>(null);
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const box = useRef<HTMLTextAreaElement | null>(null);
  const end = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setRoot(null); setReplies([]); setMissing(false);
    void api<{ root?: ThreadMessage; replies?: ThreadMessage[] }>(`/api/team/channels/${channelId}/threads/${rootId}`)
      .then((r) => { if (!alive) return; if (!r?.root) { setMissing(true); return; } setRoot(r.root); setReplies(Array.isArray(r.replies) ? r.replies : []); })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [channelId, rootId]);

  useEffect(() => {
    if (!live || live.root_id !== rootId) return;
    setReplies((prev) => (prev.some((m) => m.id === live.message.id) ? prev : [...prev, live.message]));
  }, [live, rootId]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => end.current?.scrollIntoView({ block: "end" }));
    return () => cancelAnimationFrame(raf);
  }, [replies.length, root]);

  async function send() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const r = await api.post<{ message?: ThreadMessage; summary?: ThreadSummary }>(`/api/team/channels/${channelId}/threads/${rootId}/messages`, { body });
      if (r?.message) setReplies((prev) => (prev.some((m) => m.id === r.message!.id) ? prev : [...prev, r.message!]));
      if (r?.summary) onSummary(rootId, r.summary);
      setDraft("");
    } catch { window.alert("Couldn't send the reply."); } finally { setBusy(false); }
  }

  const bubble = (m: ThreadMessage) => (
    <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{m.sender_id === myId ? "You" : nameOf(m.sender_id)} {"\u00B7"} {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
      <div style={{ fontSize: 14, color: "var(--ui-text)", wordBreak: "break-word" }}>
        {m.deleted_at ? <i style={{ color: "var(--ui-text-muted)" }}>Message deleted</i> : renderTeamText(m.body, memberNames)}
        {(m.attachments ?? []).map((a, i) => <a key={i} href={a.dataUrl} download={a.name} style={{ display: "block", fontSize: 13, color: "inherit", textDecoration: "underline" }}>{a.name}</a>)}
      </div>
    </div>
  );

  return (
    <div data-testid="team-thread-panel" style={{ width: 360, maxWidth: "45%", borderLeft: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ui-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "var(--ui-text)" }}>Thread</span>
        <button onClick={onClose} aria-label="Close thread" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ui-text-muted)" }}>{"\u00D7"}</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {missing && <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>This thread is no longer available.</div>}
        {root && bubble(root)}
        {root && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", paddingBottom: 6 }}>{replies.length} {replies.length === 1 ? "reply" : "replies"}</div>}
        {replies.map(bubble)}
        <div ref={end} />
      </div>
      {!missing && (
        <div style={{ borderTop: "1px solid var(--ui-border)", padding: 10, paddingBottom: "max(10px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FormatBar target={box} value={draft} onChange={setDraft} />
            <FullEmojiPicker onPick={(e) => setDraft((d) => d + e)} buttonStyle={{ width: 30, height: 26, fontSize: 14 }} align="right" />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <textarea ref={box} value={draft} disabled={disabled} rows={Math.min(6, Math.max(1, draft.split("\n").length))} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={disabled ? "This channel is archived" : "Reply\u2026"} aria-label="Reply in thread"
              style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14, resize: "none", fontFamily: "inherit" }} />
            <button onClick={() => void send()} disabled={busy || !draft.trim() || disabled} style={{ padding: "0 14px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
