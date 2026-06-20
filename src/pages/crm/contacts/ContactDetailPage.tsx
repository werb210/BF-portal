import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { crmApi, type ContactRow, type Scope } from "@/api/crm";
import { api } from "@/api";
import { ActionBar } from "@/components/crm/ActionBar";
import { UnifiedTimeline } from "@/components/crm/UnifiedTimeline"; // BF_PORTAL_UNIFIED_TIMELINE_v1
import { ContactApplicantFields, ContactAdvisors } from "@/components/crm/ContactApplicationDetails"; // BF_PORTAL_CRM_CONTACT_PANELS_v1
import { EntityEditModal } from "@/components/EntityEditModal";
import MarketingHeader from "@/pages/crm/contacts/MarketingHeader";
import MarketingTab from "@/pages/crm/contacts/tabs/MarketingTab";

export default function ContactDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const scope: Scope = { kind: "contact", id };
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]); // BF_PORTAL_BLOCK_v756_CONTACT_OWNER_EDIT
  useEffect(() => { // BF_PORTAL_BLOCK_v756_CONTACT_OWNER_EDIT
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ users?: Array<{ id: string; first_name?: string; last_name?: string }> } | Array<{ id: string; first_name?: string; last_name?: string }>>("/api/users");
        const list = Array.isArray(r) ? r : (r?.users ?? []);
        if (!cancelled) setOwners(list);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
    <>
      <div style={layout}>
      <aside style={rail}>
        <Link
          to="/crm/contacts"
          style={{ color: "#1d4ed8", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
        >← Back to contacts</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>{contact.name}</h2><span style={roleBadge}>{formatRole(contact.role)}</span></div>
        {contact.job_title && <div style={subtle}>{contact.job_title}</div>}
        <MarketingHeader contactId={id} />
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ color: "#0091ae" }}>{contact.email}</a>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={() => setEditOpen(true)} style={actionBtn}>Edit</button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this contact? This cannot be undone.")) return;
              try {
                await api.delete(`/api/crm/contacts/${id}`);
                navigate("/crm/contacts");
              } catch (error: any) {
                setErr(error?.message ?? "Could not delete contact.");
              }
            }}
            style={{ ...actionBtn, borderColor: "#fecaca", color: "#b91c1c" }}
          >
            Delete
          </button>
        </div>
        <ActionBar
          scope={scope}
          contactEmail={contact.email}
          contactPhone={contact.phone}
          contactName={contact.name}
          onChanged={() => setRefreshKey(k => k + 1)}
        />
        <ContactApplicantFields applicationIds={contact.applicationIds} />
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
        <UnifiedTimeline contactId={id} scope={scope} refreshKey={refreshKey} />
        <div style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }}><MarketingTab contactId={id} /></div>
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
        <ContactAdvisors applicationIds={contact.applicationIds} />
      </aside>
      </div>

      {/* BF_CONTACT_EDIT_v24 */}
      <EntityEditModal
        open={editOpen}
        title="Edit contact"
        initial={{
          name: contact.name ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          lead_status: contact.lead_status ?? "",
          lifecycle_stage: contact.lifecycle_stage ?? "",
          job_title: contact.job_title ?? "",
          owner_id: contact.owner_id ?? "", // BF_PORTAL_BLOCK_v756_CONTACT_OWNER_EDIT
        }}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "tel" },
          { key: "job_title", label: "Job title" },
          { key: "lead_status", label: "Status" },
          { key: "lifecycle_stage", label: "Stage" },
          { key: "owner_id", label: "Owner", type: "select", options: [{ value: "", label: "— Unassigned —" }, ...owners.map((u) => ({ value: u.id, label: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.id }))] }, // BF_PORTAL_BLOCK_v756_CONTACT_OWNER_EDIT
        ]}
        onClose={() => setEditOpen(false)}
        onSave={async (data) => {
          await api.patch(`/api/crm/contacts/${id}`, data);
          setRefreshKey((value) => value + 1);
        }}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ color: "var(--ui-text)" }}>{value || "—"}</div>
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 16,
  padding: 16, background: "var(--ui-surface-strong)", color: "var(--ui-text)",
};
const rail: CSSProperties = {
  background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16,
};
const subtle: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 12 };
const fieldsBlock: CSSProperties = { marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-border-soft)" };
const fieldLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const roleBadge: CSSProperties = { background: "var(--ui-surface-muted)", color: "var(--ui-text)", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 };

function formatRole(role?: string | null) {
  const value = String(role ?? "unknown").toLowerCase();
  if (value === "applicant") return "Applicant";
  if (value === "partner") return "Partner";
  if (value === "guarantor") return "Guarantor";
  if (value === "other") return "Other";
  return "Unknown";
}

const actionBtn: CSSProperties = { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" };
