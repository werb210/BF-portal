// BF_PORTAL_TEAM_PHASE_B_v661 - details for a channel or group: name, topic, private or public,
// members (add people), leave, and archive / unarchive.
import { useState } from "react";
import { api } from "@/api";

type Channel = { id: string; kind: string; name: string | null; topic?: string | null; is_private?: boolean; archived_at?: string | null; member_ids: string[] };
type User = { id: string; name: string };

export default function ChannelSettings({ channel, users, myId, onClose, onChanged, onLeft }: {
  channel: Channel; users: User[]; myId: string | null; onClose: () => void; onChanged: () => void; onLeft: () => void;
}) {
  const [name, setName] = useState(channel.name ?? "");
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [isPrivate, setIsPrivate] = useState(Boolean(channel.is_private));
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isChannel = channel.kind === "channel";
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "Someone";
  const others = users.filter((u) => !channel.member_ids.includes(u.id) && u.id !== myId);

  async function run(fn: () => Promise<unknown>, done?: () => void) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); (done ?? onClose)(); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || "That didn't work."); }
    finally { setBusy(false); }
  }
  const save = () => run(() => api.patch(`/api/team/channels/${channel.id}`, { name, topic, ...(isChannel ? { is_private: isPrivate } : {}) }));
  const add = () => run(() => api.post(`/api/team/channels/${channel.id}/members`, { member_ids: Array.from(adding) }));
  const leave = () => { if (window.confirm("Leave " + (isChannel ? "#" + channel.name : "this group") + "?")) void run(() => api.post(`/api/team/channels/${channel.id}/leave`, {}), onLeft); };
  const archive = () => void run(() => api.post(`/api/team/channels/${channel.id}/archive`, { archived: !channel.archived_at }));
  const field = { padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14 } as const;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="team-channel-settings" style={{ width: 440, maxWidth: "94vw", maxHeight: "86vh", overflowY: "auto", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ui-text)" }}>{isChannel ? "Channel details" : "Group details"}</div>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Name<input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" style={{ ...field, display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={250} aria-label="Topic" placeholder="What this conversation is for" style={{ ...field, display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
        {isChannel && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--ui-text)" }}>
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} aria-label="Private" />
            Private: only people who are added can see and join it
          </label>
        )}
        <button disabled={busy} onClick={() => void save()} style={{ alignSelf: "flex-end", padding: "8px 16px", border: "none", background: "var(--ui-accent-blue)", color: "#fff", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Save</button>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-text)", marginTop: 6 }}>Members ({channel.member_ids.length})</div>
        <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{channel.member_ids.map(nameOf).join(", ")}</div>
        {others.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Add people</div>
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
              {others.map((u) => (
                <label key={u.id} style={{ display: "flex", gap: 8, padding: "6px 10px", fontSize: 13, color: "var(--ui-text)", cursor: "pointer" }}>
                  <input type="checkbox" checked={adding.has(u.id)} onChange={() => setAdding((prev) => { const n = new Set(prev); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n; })} />{u.name}
                </label>
              ))}
            </div>
            <button disabled={busy || adding.size === 0} onClick={() => void add()} style={{ alignSelf: "flex-end", padding: "6px 14px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer" }}>Add {adding.size || ""}</button>
          </>
        )}
        {error && <div style={{ color: "#ff3b30", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, borderTop: "1px solid var(--ui-border)", paddingTop: 12 }}>
          <span style={{ display: "flex", gap: 8 }}>
            <button disabled={busy} onClick={leave} style={{ padding: "8px 14px", border: "1px solid #ff3b30", color: "#ff3b30", background: "transparent", borderRadius: 8, cursor: "pointer" }}>Leave</button>
            {isChannel && <button disabled={busy} onClick={archive} style={{ padding: "8px 14px", border: "1px solid var(--ui-border)", background: "transparent", borderRadius: 8, cursor: "pointer" }}>{channel.archived_at ? "Unarchive" : "Archive"}</button>}
          </span>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}
