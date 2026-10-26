import { useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCrmBase } from "@/pages/crm/crmBase"; // BF_PORTAL_v850_KS_CRM
import { api } from "@/api";
import { crmApi, type CompanyRow, type ContactRow, type Scope } from "@/api/crm";
import { ActionBar } from "@/components/crm/ActionBar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { useBfCrmBackend } from "@/components/crm/unified/crmUnifiedApi"; // BF_PORTAL_v856_CRM_UNIFY
import { useTagCatalogue } from "@/components/crm/unified/CrmTags"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmDuplicatesBanner } from "@/components/crm/unified/CrmDuplicates"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmAiSummary } from "@/components/crm/unified/CrmAiSummary"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmCompanyDetails, CrmCompanyPeople, CrmCompanyTagEditor } from "@/components/crm/unified/CrmCompany"; // BF_PORTAL_v856_CRM_UNIFY
import { AuthContext } from "@/auth/AuthContext";
import { canDelete } from "@/auth/canDelete";
import { EntityEditModal } from "@/components/EntityEditModal";
import RetentionLock from "@/retention/RetentionLock"; // BF_PORTAL_v855_RETENTION
import { refusedDeleteMessage, useRetention } from "@/retention/retention"; // BF_PORTAL_v855_RETENTION

export default function CompanyDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const crmBase = useCrmBase(); // BF_PORTAL_v850_KS_CRM
  const auth = useContext(AuthContext);
  const scope: Scope = { kind: "company", id };
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const retention = useRetention("company", canDelete(auth?.user?.role) ? id : null, refreshKey); // BF_PORTAL_v855_RETENTION
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const canDeleteCompany = canDelete(auth?.user?.role);
  const crmBackend = useBfCrmBackend(); // BF_PORTAL_v856_CRM_UNIFY
  const { catalogue: tagCatalogue } = useTagCatalogue(crmBackend); // BF_PORTAL_v856_CRM_UNIFY

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

  // BF_PORTAL_CRM_COMPANY_BUSINESS_v1 — Step-3 business data lives on the linked
  // application; take the primary applicant's app first, then any contact's.
  const applicationIds = useMemo(() => {
    const ordered = [...grouped.primary, ...contacts];
    const ids = ordered.flatMap((c) => c.applicationIds ?? []);
    return Array.from(new Set(ids));
  }, [grouped.primary, contacts]);

  if (err) return <div style={{ padding: 24, color: "#b00020" }}>{err}</div>;
  if (!company) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className="crm-detail-layout">
      <aside style={rail}>
        <Link to={`${crmBase}/contacts`} style={{ color: "var(--ui-accent-fg)", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>← Back to contacts</Link>
        <h2 style={{ marginTop: 0 }}>{company.name}</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setEditOpen(true)} style={actionBtn}>Edit</button>
          {canDeleteCompany && retention?.locked ? <RetentionLock status={retention} /> : canDeleteCompany ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Delete this company? This cannot be undone.")) return;
                try {
                  await api.delete(`/api/crm/companies/${id}`);
                  navigate(`${crmBase}/companies`);
                } catch (error: any) {
                  setErr(refusedDeleteMessage(error) ?? error?.message ?? "Could not delete company."); // BF_PORTAL_v855_RETENTION
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
        <ActionBar scope={scope} googleQuery={company.name ?? undefined} onChanged={() => setRefreshKey(k => k + 1)} />
        {/* BF_PORTAL_v856_CRM_UNIFY - every company detail (record, else the latest application), editable; tags. */}
        <CrmCompanyTagEditor backend={crmBackend} companyId={id} catalogue={tagCatalogue} refreshKey={refreshKey} />
        <CrmCompanyDetails backend={crmBackend} companyId={id} refreshKey={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />
      </aside>

      <main>
        <CrmDuplicatesBanner backend={crmBackend} entity="company" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY */}
        <CrmAiSummary backend={crmBackend} entity="company" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY - same spot as on a contact */}
        <ActivityTimeline scope={scope} refreshKey={refreshKey} />
      </main>

      <aside style={rail}>
        <CrmCompanyPeople backend={crmBackend} companyId={id} refreshKey={refreshKey} />{/* BF_PORTAL_v856_CRM_UNIFY */}
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
  const crmBase = useCrmBase(); // BF_PORTAL_v850_KS_CRM
  return (
    <section style={{ marginBottom: 12 }}>
      <div style={fieldLabel}>{title}</div>
      {contacts.length === 0 && <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>—</div>}
      {contacts.map((c) => (
        <div key={c.id} style={{ marginTop: 6, borderBottom: "1px solid var(--ui-border-soft)", paddingBottom: 6 }}>
          <Link to={`${crmBase}/contacts/${c.id}`} style={{ color: "#0091ae", fontWeight: 600 }}>{c.name}</Link>
          {c.email ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.email}</div> : null}
          {c.phone ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.phone}</div> : null}
          {typeof c.ownership_percent === "number" ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Ownership: {c.ownership_percent}%</div> : null}
        </div>
      ))}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return <div style={{ marginBottom: 8 }}><div style={fieldLabel}>{label}</div><div style={{ color: "var(--ui-text)" }}>{value || "—"}</div></div>;
}

const rail: CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 };
const subtle: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 12 };
const fieldsBlock: CSSProperties = { marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-border-soft)" };
const fieldLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const actionBtn: CSSProperties = { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" };
