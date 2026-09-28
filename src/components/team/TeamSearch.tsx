// BF_PORTAL_TEAM_PHASE_B_v661 - search every conversation you are in (messages, thread replies and
// file names) plus channel names. Picking a result opens that conversation (and its thread).
import { useEffect, useState } from "react";
import { api } from "@/api";

export type SearchHit = { id: string; channel_id: string; sender_id: string | null; body: string; created_at: string; thread_root_id: string | null; channel_kind: string; channel_name: string | null; files: string[] };
type ChannelHit = { id: string; name: string; topic: string | null };

export default function TeamSearch({ nameOf, onClose, onOpen, onBrowse }: {
  nameOf: (id: string | null) => string; onClose: () => void; onOpen: (channelId: string, threadRootId: string | null) => void; onBrowse: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ messages: SearchHit[]; channels: ChannelHit[] } | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    let live = true;
    const t = setTimeout(() => {
      void api<{ messages?: SearchHit[]; channels?: ChannelHit[] }>("/api/team/search", { params: { q: term } })
        .then((r) => { if (live) setHits({ messages: r?.messages ?? [], channels: r?.channels ?? [] }); })
        .catch(() => { if (live) setHits({ messages: [], channels: [] }); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const where = (h: SearchHit) => (h.channel_kind === "channel" && h.channel_name ? "#" + h.channel_name : h.channel_name || "Direct message");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh", zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="team-search" style={{ width: 560, maxWidth: "94vw", maxHeight: "74vh", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all messages, files and channels" aria-label="Search Team"
          style={{ padding: "10px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 15 }} />
        <div style={{ overflowY: "auto" }}>
          {hits && hits.channels.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--ui-text-muted)", margin: "4px 0" }}>Channels</div>
              {hits.channels.map((c) => (
                <div key={c.id} onClick={onBrowse} style={{ padding: "6px 8px", cursor: "pointer", fontSize: 14, color: "var(--ui-text)" }}># {c.name}{c.topic ? <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{" \u00B7 " + c.topic}</span> : null}</div>
              ))}
            </div>
          )}
          {hits && <div style={{ fontSize: 11, color: "var(--ui-text-muted)", margin: "4px 0" }}>Messages ({hits.messages.length})</div>}
          {hits && hits.messages.length === 0 && <div style={{ padding: 8, fontSize: 13, color: "var(--ui-text-muted)" }}>Nothing found.</div>}
          {hits?.messages.map((h) => (
            <div key={h.id} onClick={() => onOpen(h.channel_id, h.thread_root_id ?? null)} data-testid="team-search-hit" style={{ padding: "8px", borderBottom: "1px solid var(--ui-surface-muted)", cursor: "pointer" }}>
              <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{where(h)}{h.thread_root_id ? " \u00B7 in a thread" : ""} {"\u00B7"} {nameOf(h.sender_id)} {"\u00B7"} {new Date(h.created_at).toLocaleString()}</div>
              <div style={{ fontSize: 14, color: "var(--ui-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.body || (h.files.length ? "\u{1F4CE} " + h.files.join(", ") : "")}</div>
            </div>
          ))}
          {!hits && <div style={{ padding: 8, fontSize: 13, color: "var(--ui-text-muted)" }}>Type at least two letters.</div>}
        </div>
      </div>
    </div>
  );
}
