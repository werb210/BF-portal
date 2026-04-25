import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import { crmApi, type CompanyRow, type ContactRow, type Scope } from "@/api/crm";
import { ActionBar } from "@/components/crm/ActionBar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";

export default function CompanyDetailPage() {
  const { id = "" } = useParams();
  const scope: Scope = { kind: "company", id };
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);

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
        const r = await api.get<{ data?: ContactRow[] } | ContactRow[]>(
          `/api/crm/contacts`, { params: { companyId: id } },
        );
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) setContacts(list);
      } catch {
        if (!cancelled) setContacts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  if (err) return <div style={{ padding: 24, color: "#b00020" }}>{err}</div>;
  if (!company) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={layout}>
      <aside style={rail}>
        <h2 style={{ marginTop: 0 }}>{company.name}</h2>
        {company.industry && <div style={subtle}>{company.industry}</div>}
        {company.domain && (
          <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" style={{ color: "#0091ae" }}>
            {company.domain}
          </a>
        )}
        <ActionBar
          scope={scope}
          onChanged={() => setRefreshKey(k => k + 1)}
        />
        <div style={fieldsBlock}>
          <Field label="Industry" value={company.industry ?? null} />
          <Field label="Domain"   value={company.domain ?? null} />
          <Field label="City"     value={company.city ?? null} />
          <Field label="Region"   value={company.region ?? null} />
          <Field label="Owner"    value={company.owner_name ?? null} />
          <Field label="Created"  value={company.created_at ? new Date(company.created_at).toLocaleString() : null} />
        </div>
        {company.types_of_financing && company.types_of_financing.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={fieldLabel}>Types of financing</div>
            <div style={{ marginTop: 4 }}>
              {company.types_of_financing.map(t => (
                <span key={t} style={tag}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main>
        <ActivityTimeline scope={scope} refreshKey={refreshKey} />
      </main>

      <aside style={rail}>
        <h3 style={{ marginTop: 0 }}>Contacts</h3>
        {contacts.length === 0 && <div style={subtle}>No associated contacts.</div>}
        {contacts.map(c => (
          <div key={c.id} style={{ marginBottom: 8 }}>
            <Link to={`/crm/contacts/${c.id}`} style={{ color: "#0091ae" }}>{c.name}</Link>
            {c.email && <div style={{ fontSize: 12, color: "#7c98b6" }}>{c.email}</div>}
          </div>
        ))}
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ color: "#000" }}>{value || "—"}</div>
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 16,
  padding: 16, background: "#fff", color: "#000",
};
const rail: CSSProperties = {
  background: "#fff", border: "1px solid #eaf0f6", borderRadius: 6, padding: 16,
};
const subtle: CSSProperties = { color: "#516f90", fontSize: 13, marginBottom: 12 };
const fieldsBlock: CSSProperties = { marginTop: 16, paddingTop: 16, borderTop: "1px solid #eaf0f6" };
const fieldLabel: CSSProperties = { fontSize: 11, color: "#7c98b6", textTransform: "uppercase" };
const tag: CSSProperties = {
  display: "inline-block", background: "#cef7e6", color: "#0a6e57",
  padding: "2px 8px", borderRadius: 12, fontSize: 12, marginRight: 4, marginBottom: 4,
};
