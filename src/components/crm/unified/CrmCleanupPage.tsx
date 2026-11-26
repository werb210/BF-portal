// BF_PORTAL_v856_CRM_UNIFY - "Clean up data", the same in every CRM. Review first: a scan only PROPOSES changes
// (names in ALL CAPS or all lower case, phone formats, emails with capitals or spaces, stray spaces, and
// "Unknown (application started)" where the real name is known). Staff tick what to fix, then Fix selected / Fix all.
// Every applied batch can be undone.
import { formatDateTimeShort } from "@/utils/labels";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { crmUnified, errorText, type CleanupBatch, type CleanupChange, type CrmBackend, type CrmEntity } from "./crmUnifiedApi";
import { plainBtn, primaryBtn } from "./CrmTags";
import { confirmAction } from "@/lib/confirmAction";

// UI_REVIEW_2026_11_19 - Insurance records the person as an id; show "you" for the signed-in user, never a raw id.
function actorWords(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
  try {
    const raw = localStorage.getItem("auth_token") ?? sessionStorage.getItem("auth_token") ?? "";
    const payload = JSON.parse(atob((raw.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/")));
    const me = String(payload?.sub ?? payload?.userId ?? payload?.id ?? payload?.staffUserId ?? "");
    if (me && me.toLowerCase() === s.toLowerCase()) return "you";
  } catch { /* no token */ }
  return "staff";
}

const keyOf = (c: CleanupChange) => `${c.entity}:${c.entityId}:${c.field}`;
const FIELD_LABELS: Record<string, string> = {
  name: "Name", full_name: "Name", first_name: "First name", last_name: "Last name", email: "Email", secondary_email: "Secondary email",
  phone: "Phone", phone_e164: "Phone", secondary_phone: "Secondary phone", job_title: "Job title", title: "Title",
  legal_name: "Legal name", dba_name: "Operating / DBA name", operating_name: "Operating / DBA name", website: "Website",
  domain: "Domain", industry: "Industry", address_city: "City", city: "City",
};

// BF_PORTAL_CLEANUP_ONE_NAME_ROW_v1 (Todd, 2026-11-26: "you list the first name, then the last name then the complete
// name. why?") - a person's name shows once. Its name, first-name and last-name fixes are one row with one tick box and
// one Ignore button; they are still saved as separate changes so Undo works as before.
const NAME_FIELDS = new Set(["name", "full_name", "first_name", "last_name"]);
type Row = { key: string; record: string; entityId: string; label: string; before: string; after: string; reason: string; parts: CleanupChange[] };
function rowsOf(list: CleanupChange[]): Row[] {
  const out: Row[] = [];
  const byPerson = new Map<string, Row>();
  for (const c of list) {
    if (c.entity === "contact" && NAME_FIELDS.has(c.field)) {
      const gk = `${c.entity}:${c.entityId}:name`;
      let row = byPerson.get(gk);
      if (!row) { row = { key: gk, record: c.record, entityId: c.entityId, label: "Name", before: "", after: "", reason: c.reason, parts: [] }; byPerson.set(gk, row); out.push(row); }
      row.parts.push(c);
      continue;
    }
    out.push({ key: keyOf(c), record: c.record, entityId: c.entityId, label: FIELD_LABELS[c.field] ?? c.field, before: c.before, after: c.after, reason: c.reason, parts: [c] });
  }
  for (const row of byPerson.values()) {
    const full = row.parts.find((p) => p.field === "name" || p.field === "full_name");
    const first = row.parts.find((p) => p.field === "first_name");
    const last = row.parts.find((p) => p.field === "last_name");
    row.before = full?.before ?? [first?.before, last?.before].filter(Boolean).join(" ");
    row.after = full?.after ?? [first?.after, last?.after].filter(Boolean).join(" ");
    row.reason = (full ?? first ?? last)!.reason;
  }
  return out;
}

export function CrmCleanupPage({ backend }: { backend: CrmBackend }) {
  const [entity, setEntity] = useState<CrmEntity>("contact");
  const [changes, setChanges] = useState<CleanupChange[] | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"scan" | "apply" | "undo" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [batches, setBatches] = useState<CleanupBatch[]>([]);
  const api = useMemo(() => crmUnified(backend), [backend]);

  const loadBatches = useCallback(async () => {
    try { const b = await api.cleanupBatches(); setBatches(Array.isArray(b) ? b : []); } catch { setBatches([]); }
  }, [api]);
  async function scan(which = entity) {
    setBusy("scan"); setErr(null); setMsg(null);
    try {
      const r = await api.cleanupScan(which);
      const list = Array.isArray(r?.changes) ? r.changes : [];
      setChanges(list);
      setTicked(new Set(list.map(keyOf)));
    } catch (e) {
      setErr(errorText(e, "The scan did not finish."));
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => { setChanges(null); void loadBatches(); }, [loadBatches, entity]);

  async function apply(list: CleanupChange[]) {
    if (!list.length) return;
    if (!(await confirmAction(`Apply ${list.length} change(s)? You can undo the whole batch afterwards.`))) return;
    setBusy("apply"); setErr(null); setMsg(null);
    try {
      const r = await api.cleanupApply(list);
      const skipped = Array.isArray(r?.skipped) ? r.skipped.length : 0;
      setMsg(`Fixed ${r?.applied ?? 0} value(s).${skipped ? ` ${skipped} skipped because the record changed or clashes with another record.` : ""}`);
      await loadBatches();
      await scan();
    } catch (e) {
      setErr(errorText(e, "Nothing was changed."));
    } finally {
      setBusy(null);
    }
  }
  // BF_PORTAL_v907_CLEANUP_IGNORE - an ignored proposal is remembered on the server and not proposed again.
  async function ignore(list: CleanupChange[]) {
    if (!list.length) return;
    setBusy("apply"); setErr(null); setMsg(null);
    try {
      const r = await api.cleanupIgnore(list);
      const gone = new Set(list.map(keyOf));
      setChanges((cur) => (cur ?? []).filter((c) => !gone.has(keyOf(c))));
      setTicked((cur) => new Set([...cur].filter((k) => !gone.has(k))));
      setMsg(`Ignored ${r?.ignored ?? list.length} proposed change(s). They will not be proposed again.`);
    } catch (e) {
      setErr(errorText(e, "Could not ignore those changes."));
    } finally {
      setBusy(null);
    }
  }
  async function showIgnored() {
    setBusy("scan"); setErr(null); setMsg(null);
    try {
      const r = await api.cleanupIgnoreClear(entity);
      setMsg(`${r?.cleared ?? 0} ignored change(s) will be proposed again.`);
    } catch (e) {
      setErr(errorText(e, "Could not bring the ignored changes back."));
    } finally {
      setBusy(null);
    }
    await scan();
  }

  async function undo(id: string) {
    if (!(await confirmAction("Undo this batch? Values are put back unless they were edited since."))) return;
    setBusy("undo"); setErr(null);
    try {
      const r = await api.cleanupUndo(id);
      setMsg(`Undone: ${r?.restored ?? 0} value(s) put back.`);
      await loadBatches();
      if (changes) await scan();
    } catch (e) {
      setErr(errorText(e, "Could not undo."));
    } finally {
      setBusy(null);
    }
  }

  const all = changes ?? [];
  const selected = all.filter((c) => ticked.has(keyOf(c)));
  const rows = rowsOf(all);
  const rowTicked = (r: Row) => r.parts.every((p) => ticked.has(keyOf(p)));
  const selectedRows = rows.filter(rowTicked).length;
  const linkPath = entity === "contact" ? "contacts" : "companies";
  return (
    <div style={{ padding: 24, color: "var(--ui-text)" }} data-testid="crm-cleanup-page">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Clean up data</h3>
        <span style={{ flex: 1 }} />
        {(["contact", "company"] as const).map((e) => (
          <button key={e} type="button" onClick={() => setEntity(e)} aria-pressed={entity === e}
            style={{ ...plainBtn, ...(entity === e ? { background: "#1d4ed8", color: "#ffffff", borderColor: "#1d4ed8" } : {}) }}>
            {e === "contact" ? "Contacts" : "Companies"}
          </button>
        ))}
        <button type="button" onClick={() => void scan()} disabled={busy !== null} style={primaryBtn}>{busy === "scan" ? "Scanning..." : "Scan"}</button>
        <button type="button" onClick={() => void showIgnored()} disabled={busy !== null} style={plainBtn} data-testid="cleanup-show-ignored">Show ignored again</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 12 }}>
        Nothing changes until you choose. Names in capitals or lower case are proper-cased (Mc, Mac, O' and hyphens kept;
        companies keep LLC, Inc. and Ltd.), phones are stored as +1XXXXXXXXXX and shown as (403) 555-0123, emails lose
        capitals and spaces, and placeholder names are replaced when the real name is known.
      </div>
      {msg && <div role="status" style={{ background: "#dcfce7", color: "#14532d", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{msg}</div>}
      {err && <div role="alert" style={{ color: "#b91c1c", marginBottom: 10 }}>{err}</div>}
      {changes && changes.length === 0 && <div style={{ color: "var(--ui-text-muted)" }}>Nothing to clean up.</div>}
      {changes && changes.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>{selectedRows} of {rows.length} selected</span>
            <button type="button" onClick={() => setTicked(new Set(all.map(keyOf)))} style={plainBtn}>Select all</button>
            <button type="button" onClick={() => setTicked(new Set())} style={plainBtn}>Select none</button>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => void apply(selected)} disabled={busy !== null || !selected.length} style={primaryBtn}>{busy === "apply" ? "Fixing..." : "Fix selected"}</button>
            <button type="button" onClick={() => void apply(all)} disabled={busy !== null} style={plainBtn}>Fix all</button>
            <button type="button" onClick={() => void ignore(selected)} disabled={busy !== null || !selected.length} style={plainBtn} data-testid="cleanup-ignore-selected">Ignore selected</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--ui-surface-muted)" }}>
                <th style={th} />
                <th style={th}>Record</th><th style={th}>Field</th><th style={th}>Now</th><th style={th}>Proposed</th><th style={th}>Why</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} style={{ borderBottom: "1px solid var(--ui-border-soft)" }}>
                  <td style={td}><input type="checkbox" aria-label={`Fix ${r.label} of ${r.record}`} checked={rowTicked(r)}
                    onChange={(e) => setTicked((p) => { const n = new Set(p); for (const c of r.parts) { if (e.target.checked) n.add(keyOf(c)); else n.delete(keyOf(c)); } return n; })} /></td>
                  <td style={td}><Link to={`${backend.linkBase}/${linkPath}/${r.entityId}`} style={{ color: "#1d4ed8" }}>{r.record}</Link></td>
                  <td style={td}>{r.label}</td>
                  <td style={{ ...td, color: "#991b1b", whiteSpace: "pre-wrap" }}>{JSON.stringify(r.before)}</td>
                  <td style={{ ...td, color: "#14532d", fontWeight: 600 }}>{r.after}</td>
                  <td style={{ ...td, color: "var(--ui-text-muted)" }}>{r.reason}</td>
                  <td style={td}><button type="button" onClick={() => void ignore(r.parts)} disabled={busy !== null} style={plainBtn} aria-label={`Ignore ${r.label} of ${r.record}`}>Ignore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h4 style={{ margin: "20px 0 6px", fontSize: 14 }}>Recent clean-ups</h4>
      {batches.length === 0 && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>None yet.</div>}
      {batches.map((b) => (
        <div key={b.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "4px 0" }}>
          <span>{formatDateTimeShort(b.created_at)}</span>
          <span>{b.change_count} change(s)</span>
          {actorWords(b.created_by_name) ? <span style={{ color: "var(--ui-text-muted)" }}>by {actorWords(b.created_by_name)}</span> : null}
          {b.undone_at
            ? <span style={{ color: "var(--ui-text-muted)" }}>undone {new Date(b.undone_at).toLocaleString()}</span>
            : <button type="button" onClick={() => void undo(b.id)} disabled={busy !== null} style={plainBtn}>Undo</button>}
        </div>
      ))}
    </div>
  );
}

const th: CSSProperties = { textAlign: "left", padding: 8, fontSize: 12, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const td: CSSProperties = { padding: 8, verticalAlign: "top" };
