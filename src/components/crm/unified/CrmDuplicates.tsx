// BF_PORTAL_v856_CRM_UNIFY - duplicates, the same in every CRM:
//   CrmDuplicatesBanner  on a contact or company: "There are N possible duplicates. Would you like to merge them?"
//   CrmMergeDialog       side by side: pick the record to keep and, per field, the value to keep. Timeline, tasks,
//                        notes, applications, tags and links move to the kept record; the others are deleted.
//   CrmDuplicatesPage    "Find duplicates": every group in the silo, with Merge and Not duplicates, and one button that
//                        merges every "Unknown (application started)" copy into the real record with the same phone/email.
// A record that was itself merged is never offered merges: the banner says where the surviving record is.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  crmUnified, errorText, formatPhone, type CrmBackend, type CrmEntity, type DuplicateCandidate, type DuplicateGroup, type MergePreview,
  type PlaceholderPlan,
} from "./crmUnifiedApi";

const PLACEHOLDER_RE = /application started|^\s*unknown\s*$/i;
export const isPlaceholderName = (name: unknown) => !String(name ?? "").trim() || PLACEHOLDER_RE.test(String(name ?? ""));
import { dialog, overlay, plainBtn, primaryBtn } from "./CrmTags";

const noun = (entity: CrmEntity, n: number) => (entity === "contact" ? (n === 1 ? "contact" : "contacts") : n === 1 ? "company" : "companies");
const path = (entity: CrmEntity) => (entity === "contact" ? "contacts" : "companies");

export function CrmDuplicatesBanner({ backend, entity, id, onMerged }: { backend: CrmBackend; entity: CrmEntity; id: string; onMerged?: (survivorId: string) => void }) {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [mergedInto, setMergedInto] = useState<{ id: string; name: string | null } | null>(null);
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    if (!id) return;
    crmUnified(backend).duplicates(entity, id)
      .then((r) => {
        if (!alive) return;
        setCandidates(Array.isArray(r?.candidates) ? r.candidates : []);
        setMergedInto(r?.mergedInto ? { id: r.mergedInto, name: r.mergedIntoName ?? null } : null);
        setArchived(r?.archived === true);
      })
      .catch(() => { if (alive) setCandidates([]); });
    return () => { alive = false; };
  }, [backend, entity, id, tick]);
  if (mergedInto) {
    return (
      <div role="status" data-testid="crm-merged-banner" style={banner}>
        <strong style={{ flex: 1 }}>This {noun(entity, 1)} was merged into {mergedInto.name || "another record"}. Its history now lives there.</strong>
        <Link to={`${backend.linkBase}/${path(entity)}/${mergedInto.id}`} style={{ ...primaryBtn, textDecoration: "none" }}>Open the surviving record</Link>
      </div>
    );
  }
  if (archived) {
    return (
      <div role="status" data-testid="crm-archived-banner" style={banner}>
        <strong>This {noun(entity, 1)} is archived, so it is not offered for merging. Restore it first to merge other records into it.</strong>
      </div>
    );
  }
  if (!candidates.length) return null;
  const n = candidates.length;
  async function notDuplicates() {
    try {
      await crmUnified(backend).dismissDuplicates(entity, [id, ...candidates.map((c) => c.id)]);
      setTick((t) => t + 1);
    } catch (err) {
      window.alert(errorText(err, "Could not save that."));
    }
  }
  return (
    <div role="status" data-testid="crm-duplicates-banner" style={banner}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>There {n === 1 ? "is" : "are"} {n} possible duplicate{n === 1 ? "" : "s"}. Would you like to merge them?</strong>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {candidates.slice(0, 3).map((c, i) => (
            <span key={c.id}>
              {i > 0 ? "; " : ""}
              <Link to={`${backend.linkBase}/${path(entity)}/${c.id}`} style={{ color: "#1e3a8a", fontWeight: 600 }}>{c.name || c.email || "(no name)"}</Link>
              {" "}({c.reasons.join(", ").toLowerCase()})
            </span>
          ))}
          {n > 3 ? `; and ${n - 3} more` : ""}
        </div>
      </div>
      <button type="button" onClick={() => setOpen(true)} style={primaryBtn}>Review and merge</button>
      <button type="button" onClick={() => void notDuplicates()} style={{ ...plainBtn, background: "#ffffff", color: "#1f2937" }}>Not duplicates</button>
      {open && (
        <CrmMergeDialog backend={backend} entity={entity} ids={[id, ...candidates.map((c) => c.id)]} preferredId={id}
          onClose={() => setOpen(false)}
          onMerged={(survivorId) => {
            setOpen(false);
            setTick((t) => t + 1);
            if (onMerged) onMerged(survivorId);
            else if (survivorId !== id) navigate(`${backend.linkBase}/${path(entity)}/${survivorId}`);
          }} />
      )}
    </div>
  );
}

export function CrmMergeDialog({ backend, entity, ids, preferredId, onClose, onMerged }: {
  backend: CrmBackend; entity: CrmEntity; ids: string[]; preferredId?: string; onClose: () => void; onMerged: (survivorId: string) => void;
}) {
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [keepId, setKeepId] = useState<string>(preferredId ?? ids[0] ?? "");
  const [keepTouched, setKeepTouched] = useState(false);
  const [included, setIncluded] = useState<Set<string>>(new Set(ids));
  const [choice, setChoice] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    crmUnified(backend).mergePreview(entity, ids)
      .then((p) => { if (alive) setPreview(p); })
      .catch((e) => { if (alive) setErr(errorText(e, "Could not load the records.")); });
    return () => { alive = false; };
  }, [backend, entity, ids]);
  // Never suggest keeping an "Unknown (application started)" placeholder when a real record is in the group.
  useEffect(() => {
    if (keepTouched || !preview?.records?.length) return;
    const kept = preview.records.find((r) => r.id === keepId);
    if (kept && isPlaceholderName(kept.title)) {
      const real = preview.records.find((r) => !isPlaceholderName(r.title));
      if (real) setKeepId(real.id);
    }
  }, [preview, keepId, keepTouched]);
  // Default per field: the kept record's value, else the first record that has one.
  const defaults = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const f of preview?.fields ?? []) {
      const mine = f.values.find((v) => v.id === keepId)?.value ?? null;
      out[f.key] = mine ?? f.values.find((v) => included.has(v.id) && v.value != null)?.value ?? null;
    }
    return out;
  }, [preview, keepId, included]);
  const value = (key: string) => (key in choice ? choice[key] : defaults[key]) ?? null;
  const records = (preview?.records ?? []).filter((r) => included.has(r.id));
  const fields = (preview?.fields ?? []).filter((f) => new Set(f.values.filter((v) => included.has(v.id)).map((v) => v.value ?? "")).size > 1);

  async function merge() {
    const losers = records.map((r) => r.id).filter((x) => x !== keepId);
    if (!losers.length) return;
    if (!window.confirm(`Merge ${losers.length} ${noun(entity, losers.length)} into the kept record? Their timeline, tasks, notes, applications, tags and links move over, then they are deleted.`)) return;
    setBusy(true); setErr(null);
    const fieldsOut: Record<string, string | null> = {};
    for (const f of preview?.fields ?? []) fieldsOut[f.key] = value(f.key);
    try {
      const out = (await crmUnified(backend).merge(entity, keepId, losers, fieldsOut)) as { survivorId?: string } | null;
      // The server follows merge chains: the record that survived may be a later one.
      onMerged(typeof out?.survivorId === "string" && out.survivorId ? out.survivorId : keepId);
    } catch (e) {
      setErr(errorText(e, "The merge did not go through. Nothing was changed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-label="Merge duplicates" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...dialog, width: 960 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Merge {noun(entity, 2)}</h3>
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 12 }}>
          Choose the record to keep and, where they differ, which value to keep. Everything else moves to the kept record.
        </div>
        {!preview && !err && <div>Loading...</div>}
        {preview && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Field</th>
                  {(preview.records ?? []).map((r) => (
                    <th key={r.id} style={{ ...th, opacity: included.has(r.id) ? 1 : 0.5 }}>
                      <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
                        <input type="radio" name="keep" checked={keepId === r.id} disabled={!included.has(r.id)} onChange={() => { setKeepTouched(true); setKeepId(r.id); }} />
                        Keep: {r.title}
                      </label>
                      <div style={{ fontWeight: 400, fontSize: 11, color: "var(--ui-text-muted)" }}>
                        {r.application_count} application(s){r.contact_count != null ? `, ${r.contact_count} contact(s)` : ""}{r.created_at ? `, created ${r.created_at.slice(0, 10)}` : ""}
                      </div>
                      {r.id !== keepId && (
                        <label style={{ fontSize: 11, fontWeight: 400, display: "flex", gap: 4, alignItems: "center" }}>
                          <input type="checkbox" checked={included.has(r.id)} onChange={(e) => setIncluded((p) => { const n = new Set(p); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} />
                          Include in merge
                        </label>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 && (
                  <tr><td colSpan={1 + preview.records.length} style={{ ...td, color: "var(--ui-text-muted)" }}>The records have the same details; merging keeps them.</td></tr>
                )}
                {fields.map((f) => (
                  <tr key={f.key}>
                    <td style={{ ...td, fontWeight: 600 }}>{f.label}</td>
                    {f.values.map((v) => (
                      <td key={v.id} style={{ ...td, opacity: included.has(v.id) ? 1 : 0.5 }}>
                        <label style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <input type="radio" name={`f-${f.key}`} disabled={!included.has(v.id)} checked={value(f.key) === v.value}
                            onChange={() => setChoice((c) => ({ ...c, [f.key]: v.value }))} />
                          <span style={{ wordBreak: "break-word" }}>{v.display ?? <span style={{ color: "var(--ui-text-muted)" }}>(empty)</span>}</span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, fontWeight: 600 }}>Tags</td>
                  <td colSpan={preview.records.length} style={td}>All tags are kept: {Array.from(new Set(records.flatMap((r) => r.tags))).join(", ") || "none"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {err && <div role="alert" style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} disabled={busy} style={plainBtn}>Cancel</button>
          <button type="button" onClick={() => void merge()} disabled={busy || !preview || records.length < 2} style={primaryBtn}>{busy ? "Merging..." : "Merge"}</button>
        </div>
      </div>
    </div>
  );
}

export function CrmDuplicatesPage({ backend }: { backend: CrmBackend }) {
  const [entity, setEntity] = useState<CrmEntity>("contact");
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mergeIds, setMergeIds] = useState<string[] | null>(null);
  const [mergeKeep, setMergeKeep] = useState<string | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [phBusy, setPhBusy] = useState(false);
  const [phNote, setPhNote] = useState<string | null>(null);
  const placeholderGroups = (groups ?? []).filter((g) => (g.placeholders ?? 0) > 0).length;
  async function mergePlaceholders() {
    setPhBusy(true); setPhNote(null);
    try {
      const plan = (await crmUnified(backend).mergePlaceholders(true)) as PlaceholderPlan;
      const count = plan?.contacts ?? 0;
      if (!count) { setPhNote("No placeholder copies to merge."); return; }
      if (!window.confirm(`Merge ${count} "Unknown (application started)" ${count === 1 ? "copy" : "copies"} into the real record with the same phone or email (${plan.groups} ${plan.groups === 1 ? "person" : "people"})? Their history moves over, then the copies are deleted.`)) return;
      const done = (await crmUnified(backend).mergePlaceholders(false)) as PlaceholderPlan;
      setPhNote(`Merged ${done?.merged ?? 0} placeholder ${done?.merged === 1 ? "copy" : "copies"}${done?.failed?.length ? `; ${done.failed.length} could not be merged` : ""}.`);
      setTick((t) => t + 1);
    } catch (e) {
      setPhNote(errorText(e, "The placeholder merge did not go through."));
    } finally {
      setPhBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    setGroups(null); setErr(null);
    crmUnified(backend).duplicateGroups(entity)
      .then((r) => { if (alive) setGroups(Array.isArray(r?.groups) ? r.groups : []); })
      .catch((e) => { if (alive) setErr(errorText(e, "Could not look for duplicates.")); });
    return () => { alive = false; };
  }, [backend, entity, tick]);
  async function dismiss(ids: string[]) {
    try { await crmUnified(backend).dismissDuplicates(entity, ids); setTick((t) => t + 1); } catch (e) { window.alert(errorText(e, "Could not save that.")); }
  }
  return (
    <div style={{ padding: 24, color: "var(--ui-text)" }} data-testid="crm-duplicates-page">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Find duplicates</h3>
        <span style={{ flex: 1 }} />
        {(["contact", "company"] as const).map((e) => (
          <button key={e} type="button" onClick={() => setEntity(e)} aria-pressed={entity === e}
            style={{ ...plainBtn, ...(entity === e ? { background: "#1d4ed8", color: "#ffffff", borderColor: "#1d4ed8" } : {}) }}>
            {e === "contact" ? "Contacts" : "Companies"}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 12 }}>
        {entity === "contact"
          ? "Same email, same phone (last 10 digits), exactly the same name, or a similar name at the same company. \"Unknown (application started)\" copies are matched by phone and email, and the real record is suggested to keep."
          : "Same or similar name (\"Big Broker\" and \"Big Brokerage\"), same website, phone or email."}
      </div>
      {entity === "contact" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void mergePlaceholders()} disabled={phBusy} style={plainBtn} data-testid="crm-merge-placeholders">
            {phBusy ? "Merging..." : `Merge placeholder copies${placeholderGroups ? ` (${placeholderGroups})` : ""}`}
          </button>
          {phNote && <span role="status" style={{ fontSize: 13 }}>{phNote}</span>}
        </div>
      )}
      {err && <div role="alert" style={{ color: "#b91c1c" }}>{err}</div>}
      {!groups && !err && <div>Looking...</div>}
      {groups && groups.length === 0 && <div style={{ color: "var(--ui-text-muted)" }}>No possible duplicates found.</div>}
      {groups?.map((g) => (
        <div key={g.ids.join("|")} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <strong>{g.ids.length} {noun(entity, g.ids.length)}</strong>
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{g.reasons.join(", ")}</span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => { setMergeKeep(g.survivorId); setMergeIds(g.ids); }} style={primaryBtn}>Merge...</button>
            <button type="button" onClick={() => void dismiss(g.ids)} style={plainBtn}>Not duplicates</button>
          </div>
          {g.records.map((r) => (
            <div key={String(r.id)} style={{ fontSize: 13, padding: "4px 0", borderTop: "1px solid var(--ui-border-soft)" }}>
              <Link to={`${backend.linkBase}/${path(entity)}/${r.id}`} style={{ color: "#1d4ed8", fontWeight: 600 }}>{String(r.name ?? r.legal_name ?? r.email ?? "(no name)")}</Link>
              {g.survivorId === r.id && g.ids.length > 1 ? <span style={keepBadge}>suggested to keep</span> : null}
              {r.email ? <span style={muted}>{String(r.email)}</span> : null}
              {r.phone ? <span style={muted}>{formatPhone(r.phone)}</span> : null}
              {r.company_name ? <span style={muted}>{String(r.company_name)}</span> : null}
              {r.created_at ? <span style={muted}>created {String(r.created_at).slice(0, 10)}</span> : null}
            </div>
          ))}
        </div>
      ))}
      {mergeIds && (
        <CrmMergeDialog backend={backend} entity={entity} ids={mergeIds} preferredId={mergeKeep} onClose={() => setMergeIds(null)}
          onMerged={() => { setMergeIds(null); setTick((t) => t + 1); }} />
      )}
    </div>
  );
}

const banner: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px", marginBottom: 12, borderRadius: 8, background: "#fef3c7", border: "1px solid #f59e0b", color: "#1f2937" };
const th: CSSProperties = { textAlign: "left", padding: 8, borderBottom: "1px solid var(--ui-border)", verticalAlign: "top", minWidth: 180 };
const td: CSSProperties = { padding: 8, borderBottom: "1px solid var(--ui-border-soft)", verticalAlign: "top" };
const card: CSSProperties = { border: "1px solid var(--ui-border-soft)", borderRadius: 8, padding: 12, marginBottom: 10, background: "var(--ui-surface-strong)" };
const muted: CSSProperties = { marginLeft: 10, color: "var(--ui-text-muted)" };
const keepBadge: CSSProperties = { marginLeft: 8, fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "#dcfce7", color: "#14532d", border: "1px solid #86efac" };
