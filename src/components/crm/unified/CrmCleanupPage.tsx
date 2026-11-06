// BF_PORTAL_v856_CRM_UNIFY - "Clean up data", the same in every CRM. Review first: a scan only PROPOSES changes
// (names in ALL CAPS or all lower case, phone formats, emails with capitals or spaces, stray spaces, and
// "Unknown (application started)" where the real name is known). Staff tick what to fix, then Fix selected / Fix all.
// Every applied batch can be undone.
import { formatDateTimeShort } from "@/utils/labels";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { crmUnified, errorText, type CleanupBatch, type CleanupChange, type CrmBackend, type CrmEntity } from "./crmUnifiedApi";
import { plainBtn, primaryBtn } from "./CrmTags";

const keyOf = (c: CleanupChange) => `${c.entity}:${c.entityId}:${c.field}`;
const FIELD_LABELS: Record<string, string> = {
  name: "Name", full_name: "Name", first_name: "First name", last_name: "Last name", email: "Email", secondary_email: "Secondary email",
  phone: "Phone", phone_e164: "Phone", secondary_phone: "Secondary phone", job_title: "Job title", title: "Title",
  legal_name: "Legal name", dba_name: "Operating / DBA name", operating_name: "Operating / DBA name", website: "Website",
  domain: "Domain", industry: "Industry", address_city: "City", city: "City",
};

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
    if (!window.confirm(`Apply ${list.length} change(s)? You can undo the whole batch afterwards.`)) return;
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
    if (!window.confirm("Undo this batch? Values are put back unless they were edited since.")) return;
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
            <span style={{ fontSize: 13 }}>{selected.length} of {all.length} selected</span>
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
              {all.map((c) => {
                const k = keyOf(c);
                return (
                  <tr key={k} style={{ borderBottom: "1px solid var(--ui-border-soft)" }}>
                    <td style={td}><input type="checkbox" aria-label={`Fix ${FIELD_LABELS[c.field] ?? c.field} of ${c.record}`} checked={ticked.has(k)}
                      onChange={(e) => setTicked((p) => { const n = new Set(p); if (e.target.checked) n.add(k); else n.delete(k); return n; })} /></td>
                    <td style={td}><Link to={`${backend.linkBase}/${linkPath}/${c.entityId}`} style={{ color: "#1d4ed8" }}>{c.record}</Link></td>
                    <td style={td}>{FIELD_LABELS[c.field] ?? c.field}</td>
                    <td style={{ ...td, color: "#991b1b", whiteSpace: "pre-wrap" }}>{JSON.stringify(c.before)}</td>
                    <td style={{ ...td, color: "#14532d", fontWeight: 600 }}>{c.after}</td>
                    <td style={{ ...td, color: "var(--ui-text-muted)" }}>{c.reason}</td>
                    <td style={td}><button type="button" onClick={() => void ignore([c])} disabled={busy !== null} style={plainBtn} aria-label={`Ignore ${FIELD_LABELS[c.field] ?? c.field} of ${c.record}`}>Ignore</button></td>
                  </tr>
                );
              })}
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
          {b.created_by_name ? <span style={{ color: "var(--ui-text-muted)" }}>by {b.created_by_name}</span> : null}
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
