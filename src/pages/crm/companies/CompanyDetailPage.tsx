import { useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { crmApi, type CompanyRow, type ContactRow, type Scope } from "@/api/crm";
import { ActionBar } from "@/components/crm/ActionBar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { AuthContext } from "@/auth/AuthContext";
import { canDelete } from "@/auth/canDelete";
import { EntityEditModal } from "@/components/EntityEditModal";

export default function CompanyDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const scope: Scope = { kind: "company", id };
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const canDeleteCompany = canDelete(auth?.user?.role);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    (async () => {
      try {
        const c = await crmApi.getCompany(id);
        if (!cancelled) setCompany(c);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load company.");
      }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ data?: ContactRow[] } | ContactRow[]>(`/api/crm/contacts`, { params: { companyId: id } });
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) setContacts(list);
      } catch {
        if (!cancelled) setContacts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const grouped = useMemo(() => {
    const primary = contacts.filter((c) => c.is_primary_applicant || String(c.role ?? "").toLowerCase() === "applicant");
    return {
      primary,
      partners: contacts.filter((c) => String(c.role ?? "").toLowerCase() === "partner"),
      guarantors: contacts.filter((c) => String(c.role ?? "").toLowerCase() === "guarantor"),
      other: contacts.filter((c) => !["applicant", "partner", "guarantor"].includes(String(c.role ?? "").toLowerCase()) && !c.is_primary_applicant),
    };
  }, [contacts]);

  if (err) return <div style={{ padding: 24, color: "#b00020" }}>{err}</div>;
  if (!company) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={layout}>
      <aside style={rail}>
        <Link to="/crm/contacts" style={{ color: "#1d4ed8", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>← Back to contacts</Link>
        <h2 style={{ marginTop: 0 }}>{company.name}</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setEditOpen(true)} style={actionBtn}>Edit</button>
          {canDeleteCompany ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Delete this company? This cannot be undone.")) return;
                try {
                  await api.delete(`/api/crm/companies/${id}`);
                  navigate("/crm/companies");
                } catch (error: any) {
                  setErr(error?.message ?? "Could not delete company.");
                }
              }}
              style={{ ...actionBtn, borderColor: "#fecaca", color: "#b91c1c" }}
            >
              Delete
            </button>
          ) : null}
        </div>
        {company.industry && <div style={subtle}>{company.industry}</div>}
        {company.domain && <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" style={{ color: "#0091ae" }}>{company.domain}</a>}
        <ActionBar scope={scope} onChanged={() => setRefreshKey(k => k + 1)} />
        <div style={fieldsBlock}>
          <Field label="Industry" value={company.industry ?? null} />
          <Field label="Domain" value={company.domain ?? null} />
          <Field label="City" value={company.city ?? null} />
          <Field label="Region" value={company.region ?? null} />
          <Field label="Owner" value={company.owner_name ?? null} />
          <Field label="Created" value={company.created_at ? new Date(company.created_at).toLocaleString() : null} />
        </div>
      </aside>

      <main>
        <ActivityTimeline scope={scope} refreshKey={refreshKey} />
      </main>

      <aside style={rail}>
        <h3 style={{ marginTop: 0 }}>People</h3>
        <PeopleSection title="Primary Applicant" contacts={grouped.primary} />
        <PeopleSection title="Partners" contacts={grouped.partners} />
        <PeopleSection title="Guarantors" contacts={grouped.guarantors} />
        <PeopleSection title="Other" contacts={grouped.other} />
      </aside>
      {/* BF_COMPANY_EDIT_v24 */}
      <EntityEditModal
        open={editOpen}
        title="Edit company"
        initial={{
          name: company.name ?? "",
          industry: company.industry ?? "",
          domain: company.domain ?? "",
          city: company.city ?? "",
          region: company.region ?? "",
        }}
        fields={[
          { key: "name", label: "Legal name", required: true },
          { key: "industry", label: "Industry" },
          { key: "domain", label: "Domain" },
          { key: "city", label: "City" },
          { key: "region", label: "Region" },
        ]}
        onClose={() => setEditOpen(false)}
        onSave={async (data) => {
          await api.patch(`/api/crm/companies/${id}`, data);
          setRefreshKey((value) => value + 1);
        }}
      />
    </div>
  );
}

function PeopleSection({ title, contacts }: { title: string; contacts: ContactRow[] }) {
  return (
    <section style={{ marginBottom: 12 }}>
      <div style={fieldLabel}>{title}</div>
      {contacts.length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>—</div>}
      {contacts.map((c) => (
        <div key={c.id} style={{ marginTop: 6, borderBottom: "1px solid #eef2f7", paddingBottom: 6 }}>
          <Link to={`/crm/contacts/${c.id}`} style={{ color: "#0091ae", fontWeight: 600 }}>{c.name}</Link>
          {c.email ? <div style={{ fontSize: 12, color: "#334155" }}>{c.email}</div> : null}
          {c.phone ? <div style={{ fontSize: 12, color: "#334155" }}>{c.phone}</div> : null}
          {typeof c.ownership_percent === "number" ? <div style={{ fontSize: 12, color: "#334155" }}>Ownership: {c.ownership_percent}%</div> : null}
        </div>
      ))}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return <div style={{ marginBottom: 8 }}><div style={fieldLabel}>{label}</div><div style={{ color: "#000" }}>{value || "—"}</div></div>;
}

const layout: CSSProperties = { display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 16, padding: 16, background: "#fff", color: "#000" };
const rail: CSSProperties = { background: "#fff", border: "1px solid #eaf0f6", borderRadius: 6, padding: 16 };
const subtle: CSSProperties = { color: "#516f90", fontSize: 13, marginBottom: 12 };
const fieldsBlock: CSSProperties = { marginTop: 16, paddingTop: 16, borderTop: "1px solid #eaf0f6" };
const fieldLabel: CSSProperties = { fontSize: 11, color: "#7c98b6", textTransform: "uppercase" };
const actionBtn: CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" };
