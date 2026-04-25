import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { crmApi, type ContactRow, type Scope } from "@/api/crm";
import { ActionBar } from "@/components/crm/ActionBar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";

export default function ContactDetailPage() {
  const { id = "" } = useParams();
  const scope: Scope = { kind: "contact", id };
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.getContact(id);
        if (!cancelled) setContact(r);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contact.");
      }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  if (err) return <div style={{ padding: 24, color: "#b00020" }}>{err}</div>;
  if (!contact) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={layout}>
      <aside style={rail}>
        <h2 style={{ marginTop: 0 }}>{contact.name}</h2>
        {contact.job_title && <div style={subtle}>{contact.job_title}</div>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ color: "#0091ae" }}>{contact.email}</a>
        )}
        <ActionBar
          scope={scope}
          contactEmail={contact.email}
          contactPhone={contact.phone}
          onChanged={() => setRefreshKey(k => k + 1)}
        />
        <div style={fieldsBlock}>
          <Field label="Email"   value={contact.email ?? null} />
          <Field label="Phone"   value={contact.phone ?? null} />
          <Field label="Status"  value={contact.lead_status ?? null} />
          <Field label="Stage"   value={contact.lifecycle_stage ?? null} />
          <Field label="Owner"   value={contact.owner_name ?? null} />
          <Field label="Created" value={contact.created_at ? new Date(contact.created_at).toLocaleString() : null} />
        </div>
      </aside>

      <main>
        <ActivityTimeline scope={scope} refreshKey={refreshKey} />
      </main>

      <aside style={rail}>
        <h3 style={{ marginTop: 0 }}>Company</h3>
        {contact.company_id && contact.company_name ? (
          <Link to={`/crm/companies/${contact.company_id}`} style={{ color: "#0091ae" }}>
            {contact.company_name}
          </Link>
        ) : (
          <div style={subtle}>No associated company.</div>
        )}
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
