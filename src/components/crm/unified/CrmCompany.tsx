// BF_PORTAL_v856_CRM_UNIFY - the company record, the same in every CRM:
//   CrmCompanyPeople   everyone linked to the company grouped by role (primary applicant, partners, guarantors,
//                      advisors from the Professional Advisors form, other contacts), with Add person (search or
//                      create, with a role) and Remove from company, both audited on the server.
//   CrmCompanyDetails  the left panel: every company detail from the record, else the latest application's business
//                      section (marked "from the application"); Edit saves to the company record.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { listStaffUsers } from "@/api/sharedShell";
import { crmUnified, errorText, formatPhone, type CrmBackend, type DetailField, type PeopleResponse, type Person, type TagCatalogue } from "./crmUnifiedApi";
import { CrmTagEditor, dangerBtn, dialog, overlay, plainBtn, primaryBtn } from "./CrmTags";

const GROUPS: Array<[Person["group"], string]> = [
  ["primary", "Primary applicant"], ["partners", "Partners"], ["guarantors", "Guarantors"], ["advisors", "Advisors"], ["other", "Other people"],
];
const ROLE_OPTIONS: Array<[string, string]> = [
  ["primary_applicant", "Primary applicant"], ["partner", "Partner"], ["guarantor", "Guarantor"], ["accountant", "Accountant"],
  ["bookkeeper", "Bookkeeper"], ["lawyer", "Lawyer"], ["advisor", "Advisor"], ["employee", "Employee"], ["other", "Other"],
];
const SOURCE_LABEL: Record<string, string> = { application: "from the application", advisor_form: "Professional Advisors form", association: "added by staff", company: "" };

export function CrmCompanyPeople({ backend, companyId, refreshKey = 0 }: { backend: CrmBackend; companyId: string; refreshKey?: number }) {
  const [data, setData] = useState<PeopleResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(0);
  const api = useMemo(() => crmUnified(backend), [backend]);
  useEffect(() => {
    let alive = true;
    api.people(companyId).then((r) => { if (alive) { setData(r && (r as PeopleResponse).groups ? r : null); setErr(null); } })
      .catch((e) => { if (alive) setErr(errorText(e, "Could not load the people.")); });
    return () => { alive = false; };
  }, [api, companyId, refreshKey, tick]);
  async function remove(p: Person) {
    if (!window.confirm(`Remove ${p.name} from this company?`)) return;
    try { await api.removePerson(companyId, p); setTick((t) => t + 1); } catch (e) { window.alert(errorText(e, "Could not remove.")); }
  }
  return (
    <section data-testid="crm-company-people">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>People</h3>
        <button type="button" onClick={() => setAdding(true)} style={plainBtn}>Add person</button>
      </div>
      {err && <div role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{err}</div>}
      {!data && !err && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
      {data && GROUPS.map(([g, label]) => (
        <div key={g} style={{ marginBottom: 10 }}>
          <div style={groupLabel}>{label}</div>
          {(data.groups[g] ?? []).length === 0 && <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>-</div>}
          {(data.groups[g] ?? []).map((p) => (
            <div key={p.key} style={{ padding: "6px 0", borderBottom: "1px solid var(--ui-border-soft)" }} data-testid="crm-company-person">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {p.contactId
                    ? <Link to={`${backend.linkBase}/contacts/${p.contactId}`} style={{ color: "#1d4ed8", fontWeight: 600 }}>{p.name}</Link>
                    : <span style={{ fontWeight: 600 }}>{p.name}</span>}
                  <div style={small}>{[p.roleLabel, p.detail, SOURCE_LABEL[p.source]].filter(Boolean).join(" - ")}</div>
                  {p.email ? <div style={small}><a href={`mailto:${p.email}`} style={{ color: "var(--ui-text)" }}>{p.email}</a></div> : null}
                  {p.phone ? <div style={small}>{formatPhone(p.phone)}</div> : null}
                </div>
                <button type="button" onClick={() => void remove(p)} style={dangerBtn} aria-label={`Remove ${p.name} from company`}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {adding && <AddPersonDialog backend={backend} companyId={companyId} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setTick((t) => t + 1); }} />}
    </section>
  );
}

function AddPersonDialog({ backend, companyId, onClose, onAdded }: { backend: CrmBackend; companyId: string; onClose: () => void; onAdded: () => void }) {
  const api = useMemo(() => crmUnified(backend), [backend]);
  const [mode, setMode] = useState<"find" | "new">("find");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; email: string | null }>>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [role, setRole] = useState("other");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (mode !== "find" || q.trim().length < 2) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      api.searchContacts(q.trim()).then((r) => { if (alive) setResults(r); }).catch(() => { if (alive) setResults([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [api, q, mode]);
  async function save() {
    setBusy(true); setErr(null);
    try {
      if (mode === "find") {
        if (!pick) { setErr("Choose a contact."); return; }
        await api.addPerson(companyId, { contactId: pick, role });
      } else {
        if (!form.name.trim() && !form.email.trim()) { setErr("Enter a name or an email."); return; }
        await api.addPerson(companyId, { contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }, role });
      }
      onAdded();
    } catch (e) {
      setErr(errorText(e, "Could not add the person."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div role="dialog" aria-label="Add person" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={dialog}>
        <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Add a person to this company</h3>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button type="button" onClick={() => setMode("find")} aria-pressed={mode === "find"} style={{ ...plainBtn, ...(mode === "find" ? active : {}) }}>Existing contact</button>
          <button type="button" onClick={() => setMode("new")} aria-pressed={mode === "new"} style={{ ...plainBtn, ...(mode === "new" ? active : {}) }}>New contact</button>
        </div>
        {mode === "find" ? (
          <>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder="Search by name, email or phone" aria-label="Search contacts" style={input} />
            <div style={{ maxHeight: 200, overflow: "auto", marginTop: 6 }}>
              {results.map((r) => (
                <label key={r.id} style={{ display: "flex", gap: 6, padding: "4px 0", fontSize: 13 }}>
                  <input type="radio" name="pick" checked={pick === r.id} onChange={() => setPick(r.id)} />
                  <span>{r.name}{r.email ? <span style={{ color: "var(--ui-text-muted)" }}> - {r.email}</span> : null}</span>
                </label>
              ))}
              {q.trim().length >= 2 && results.length === 0 && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No matches. Use "New contact".</div>}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" aria-label="Full name" style={input} />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" aria-label="Email" style={input} />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" aria-label="Phone" style={input} />
          </div>
        )}
        <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>
          Role{" "}
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...input, width: "auto" }} aria-label="Role">
            {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {err && <div role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onClose} disabled={busy} style={plainBtn}>Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy} style={primaryBtn}>{busy ? "Adding..." : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

type Owner = { id: string; first_name?: string; last_name?: string };

export function CrmCompanyDetails({ backend, companyId, owners: ownersProp, refreshKey = 0, onSaved }: {
  backend: CrmBackend; companyId: string; owners?: Owner[]; refreshKey?: number; onSaved?: () => void;
}) {
  const api = useMemo(() => crmUnified(backend), [backend]);
  const [loadedOwners, setLoadedOwners] = useState<Owner[]>([]);
  useEffect(() => {
    if (ownersProp) return;
    let alive = true;
    listStaffUsers().then((list) => { if (alive) setLoadedOwners(Array.isArray(list) ? (list as Owner[]) : []); }).catch(() => { if (alive) setLoadedOwners([]); });
    return () => { alive = false; };
  }, [ownersProp]);
  const owners = ownersProp ?? loadedOwners;
  const [fields, setFields] = useState<DetailField[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ownerName = (id?: string | null) => {
    const o = owners.find((u) => u.id === id);
    return o ? `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || null : null;
  };
  useEffect(() => {
    let alive = true;
    api.details(companyId).then((r) => { if (alive) setFields(Array.isArray(r?.fields) ? r.fields : []); })
      .catch((e) => { if (alive) setErr(errorText(e, "Could not load the company details.")); });
    return () => { alive = false; };
  }, [api, companyId, refreshKey, tick]);
  function startEdit() {
    const f: Record<string, string> = {};
    for (const x of fields ?? []) if (x.editable) f[x.key] = x.type === "owner" ? (x.raw ?? "") : (x.value ?? "");
    setForm(f);
    setEditing(true);
  }
  async function save() {
    const patch: Record<string, string | null> = {};
    for (const x of fields ?? []) {
      if (!x.editable) continue;
      const before = x.type === "owner" ? (x.raw ?? "") : (x.value ?? "");
      const now = form[x.key] ?? "";
      // Only what staff changed is saved (always to the company record).
      if (now !== before) patch[x.key] = now === "" ? null : now;
    }
    setBusy(true); setErr(null);
    try {
      const r = await api.saveDetails(companyId, patch);
      setFields(Array.isArray(r?.fields) ? r.fields : fields);
      setEditing(false);
      setTick((t) => t + 1);
      onSaved?.();
    } catch (e) {
      setErr(errorText(e, "Could not save."));
    } finally {
      setBusy(false);
    }
  }
  if (!fields) return err ? <div role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{err}</div> : <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>;
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-border-soft)" }} data-testid="crm-company-details">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Company details</strong>
        {!editing && <button type="button" onClick={startEdit} style={plainBtn}>Edit details</button>}
      </div>
      {fields.map((x) => (
        <div key={x.key} style={{ marginBottom: 8 }}>
          <div style={fieldLabel}>{x.label}</div>
          {editing && x.editable ? (
            x.type === "owner" ? (
              <select value={form[x.key] ?? ""} onChange={(e) => setForm({ ...form, [x.key]: e.target.value })} aria-label={x.label} style={input}>
                <option value="">Unassigned</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>)}
              </select>
            ) : (
              <input value={form[x.key] ?? ""} onChange={(e) => setForm({ ...form, [x.key]: e.target.value })} aria-label={x.label}
                type={x.type === "date" ? "date" : "text"} style={input} />
            )
          ) : (
            <div style={{ color: "var(--ui-text)", wordBreak: "break-word" }}>
              {x.type === "owner" ? (x.value ?? ownerName(x.raw) ?? "-")
                : x.type === "tel" && x.value ? formatPhone(x.value)
                : x.type === "url" && x.value ? <a href={/^https?:\/\//i.test(x.value) ? x.value : `https://${x.value}`} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>{x.value}</a>
                : x.type === "readonly" && x.value ? new Date(x.value).toLocaleString()
                : x.value ?? "-"}
              {x.source === "application" && <span style={{ fontSize: 11, color: "var(--ui-text-muted)" }}> (from the application)</span>}
            </div>
          )}
        </div>
      ))}
      {editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void save()} disabled={busy} style={primaryBtn}>{busy ? "Saving..." : "Save"}</button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy} style={plainBtn}>Cancel</button>
        </div>
      )}
      {err && <div role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/** Edit tags on a company: reads the company's current tags from the details endpoint (same in every silo). */
export function CrmCompanyTagEditor({ backend, companyId, catalogue, refreshKey = 0 }: { backend: CrmBackend; companyId: string; catalogue: TagCatalogue | null; refreshKey?: number }) {
  const api = useMemo(() => crmUnified(backend), [backend]);
  const [tags, setTags] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api.details(companyId).then((r) => { if (alive) setTags(Array.isArray(r?.tags) ? r.tags : []); }).catch(() => { if (alive) setTags([]); });
    return () => { alive = false; };
  }, [api, companyId, refreshKey, tick]);
  return <CrmTagEditor backend={backend} entity="company" id={companyId} tags={tags} catalogue={catalogue} onSaved={() => setTick((t) => t + 1)} />;
}

const groupLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase", marginTop: 4 };
const fieldLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const small: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)" };
const input: CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, boxSizing: "border-box" };
const active: CSSProperties = { background: "#1d4ed8", color: "#ffffff", borderColor: "#1d4ed8" };
