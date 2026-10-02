// BF_PORTAL_CUSTOMER_MATCH_LISTS_v711
// Ads > Google > Audiences: the applicants list with checkboxes and
// "Send selected to Google", and the status of both server-made lists.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";

type Row = { contact_id: string; name: string | null; email: string | null; phone: string | null; applied_at: string | null; consented: boolean; bf: boolean; cbf: boolean; sent_at: string | null };
type ListStatus = { kind: "applicants" | "funded"; name: string; listId: string | null; members: number };

const card: CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 16 };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13 };
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-CA") : "-");

export function sourceLabel(r: Pick<Row, "bf" | "cbf">): string {
  return r.bf && r.cbf ? "BF + CBF" : r.bf ? "BF" : "CBF";
}

export default function CustomerMatchPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [lists, setLists] = useState<ListStatus[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"unsent" | "all">("unsent");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ configured: boolean; rows: Row[] }>("/api/marketing/customer-match/applicants");
      setConfigured(r?.configured !== false);
      setRows(Array.isArray(r?.rows) ? r.rows : []);
    } catch { setRows([]); }
    try {
      const s = await api.get<{ lists: ListStatus[] }>("/api/marketing/customer-match/status");
      setLists(Array.isArray(s?.lists) ? s.lists : []);
    } catch { setLists([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "all" || !r.sent_at), [rows, filter]);
  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.contact_id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.contact_id)));

  const send = async () => {
    const ids = [...picked];
    if (!ids.length) return;
    if (!window.confirm(`Send ${ids.length} people to Google's "${lists.find((l) => l.kind === "applicants")?.name ?? "Applicants"}" list? Only hashed email and phone are sent.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ sent?: number; failed?: number; skipped?: number; detail?: string }>("/api/marketing/customer-match/applicants/send", { contactIds: ids });
      setMsg(`Sent ${r?.sent ?? 0}${r?.skipped ? `, skipped ${r.skipped} with no email or phone` : ""}${r?.failed ? `, ${r.failed} not accepted by Google` : ""}.`);
      setPicked(new Set());
      await load();
    } catch {
      setMsg("Google did not accept the upload. Nothing was recorded as sent - check Health and try again.");
    } finally { setBusy(false); }
  };

  return (
    <section style={card} data-testid="customer-match-panel">
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" }}>Customer Match lists</h3>
      <p style={{ ...muted, margin: "0 0 12px" }}>
        The server creates these lists in Google itself. Funded clients are added automatically. Applicants are added when you tick them below and press Send. People who opted out or deleted their account are never shown or sent. Consent is sent as granted only for people who ticked the ad-measurement box at Step 6.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {lists.map((l) => (
          <div key={l.kind} data-testid={`cm-list-${l.kind}`} style={{ border: "1px solid var(--ui-border)", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "var(--ui-text)" }}>
            <strong>{l.name}</strong>
            <div style={muted}>{l.listId ? `${l.members} sent` : "Created on first send"}</div>
          </div>
        ))}
      </div>
      {!configured && <p style={{ ...muted, color: "#92400e" }}>Google Ads is not connected, so nothing can be sent yet.</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value as "unsent" | "all")} aria-label="Show">
          <option value="unsent">Not sent yet</option>
          <option value="all">Everyone who applied</option>
        </select>
        <button type="button" className="ui-button ui-button--primary" disabled={busy || picked.size === 0 || !configured} onClick={() => void send()} data-testid="cm-send">
          {busy ? "Sending..." : `Send selected to Google (${picked.size})`}
        </button>
        {msg && <span role="status" style={{ fontSize: 13, color: "var(--ui-text)" }}>{msg}</span>}
      </div>
      {rows === null ? <p style={muted}>Loading...</p> : shown.length === 0 ? <p style={muted}>Nobody to show.</p> : (
        <div style={{ overflowX: "auto", maxHeight: 480 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", color: "var(--ui-text)" }}>
            <thead><tr style={{ textAlign: "left" }}>
              <th><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={toggleAll} /></th>
              <th>Name</th><th>Email</th><th>Phone</th><th>Applied</th><th>Source</th><th>Ad consent</th><th>Sent to Google</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.contact_id} style={{ borderTop: "1px solid var(--ui-border)" }}>
                  <td><input type="checkbox" aria-label={`Select ${r.name ?? r.email ?? r.phone ?? "contact"}`} checked={picked.has(r.contact_id)} onChange={() => toggle(r.contact_id)} /></td>
                  <td>{r.name || "-"}</td><td>{r.email || "-"}</td><td>{r.phone || "-"}</td>
                  <td>{day(r.applied_at)}</td><td>{sourceLabel(r)}</td><td>{r.consented ? "Yes" : "Not given"}</td><td>{r.sent_at ? day(r.sent_at) : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
