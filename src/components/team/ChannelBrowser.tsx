// BF_PORTAL_TEAM_PHASE_B_v661 - browse every public channel (and private ones you are in), see
// the topic and member count, join, or open one you already belong to.
import { useEffect, useState } from "react";
import { api } from "@/api";

export type BrowseRow = { id: string; name: string; topic: string | null; is_private: boolean; archived_at: string | null; member_count: number; is_member: boolean };

export default function ChannelBrowser({ onClose, onOpen, onCreate }: { onClose: () => void; onOpen: (channelId: string) => void; onCreate: () => void }) {
  const [rows, setRows] = useState<BrowseRow[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void api<{ channels?: BrowseRow[] }>("/api/team/channels/browse")
      .then((r) => { if (live) setRows(Array.isArray(r?.channels) ? r.channels : []); })
      .catch(() => { if (live) { setRows([]); setError("Couldn't load channels."); } });
    return () => { live = false; };
  }, []);

  async function join(row: BrowseRow) {
    setBusy(row.id); setError(null);
    try { await api.post(`/api/team/channels/${row.id}/join`, {}); onOpen(row.id); }
    catch { setError("Couldn't join #" + row.name + "."); }
    finally { setBusy(null); }
  }

  const needle = q.trim().toLowerCase().replace(/^#/, "");
  const shown = (rows ?? []).filter((r) => !needle || r.name.includes(needle) || (r.topic ?? "").toLowerCase().includes(needle));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="team-channel-browser" style={{ width: 480, maxWidth: "94vw", maxHeight: "80vh", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--ui-text)" }}>Browse channels</span>
          <button onClick={onCreate} style={{ fontSize: 13, color: "var(--ui-accent-fg)", background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Create channel</button>
        </div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search channels" aria-label="Search channels" style={{ padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14 }} />
        {error && <div style={{ color: "#ff3b30", fontSize: 13 }}>{error}</div>}
        <div style={{ overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
          {rows === null && <div style={{ padding: 16, color: "var(--ui-text-muted)", fontSize: 13 }}>Loading{"\u2026"}</div>}
          {rows !== null && shown.length === 0 && <div style={{ padding: 16, color: "var(--ui-text-muted)", fontSize: 13 }}>No channels match.</div>}
          {shown.map((r) => (
            <div key={r.id} style={{ padding: "10px 12px", borderBottom: "1px solid var(--ui-surface-muted)", display: "flex", alignItems: "center", gap: 10, opacity: r.archived_at ? 0.6 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ui-text)" }}>{r.is_private ? "\u{1F512} " : "# "}{r.name}{r.archived_at ? " (archived)" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.member_count} member{r.member_count === 1 ? "" : "s"}{r.topic ? " \u00B7 " + r.topic : ""}</div>
              </div>
              {r.is_member
                ? <button onClick={() => onOpen(r.id)} style={{ padding: "6px 12px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Open</button>
                : !r.archived_at && <button disabled={busy === r.id} onClick={() => void join(r)} style={{ padding: "6px 12px", border: "none", background: "var(--ui-accent-blue)", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{busy === r.id ? "Joining\u2026" : "Join"}</button>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 8, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}
