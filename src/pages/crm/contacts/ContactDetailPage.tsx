import { useEffect, useState, useContext, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCrmBase } from "@/pages/crm/crmBase"; // BF_PORTAL_v850_KS_CRM
import { crmApi, type ContactRow, type Scope } from "@/api/crm";
import { api } from "@/api";
import { ContactOneDrive } from "@/components/crm/ContactOneDrive"; // BF_PORTAL_CONTACT_ONEDRIVE_v1
import SiloContext from "@/context/SiloContext"; // BF_PORTAL_BLOCK_v_APOLLO_BI_ONLY_HOTFIX1 — defensive silo read (no throw if provider absent)
import { ActionBar } from "@/components/crm/ActionBar";
import { UnifiedTimeline } from "@/components/crm/UnifiedTimeline"; // BF_PORTAL_UNIFIED_TIMELINE_v1
import { ContactStageHistory } from "@/components/crm/ContactStageHistory"; // BF_PORTAL_CONTACT_STAGE_HISTORY_v1
import { ContactAiSummary } from "@/components/crm/ContactAiSummary"; // BF_PORTAL_CONTACT_AI_SUMMARY_v1
import { ContactApplicantFields, ContactAdvisors, ContactPartners, ContactMarketingSource, ContactCreditReadiness } from "@/components/crm/ContactApplicationDetails"; // BF_PORTAL_CRM_CONTACT_PANELS_v1 + BF_PORTAL_CREDIT_READINESS_v1
import { EntityEditModal } from "@/components/EntityEditModal";
import ContactJourney from "@/components/crm/ContactJourney"; // BF_PORTAL_VISITOR_JOURNEY_v1
import ContactRecordTabs from "@/components/crm/ContactRecordTabs"; // BF_PORTAL_CONTACT_RECORD_TABS_v272
import { ContactDocuments } from "@/components/crm/ContactDocuments"; // BF_PORTAL_CONTACT_DOCUMENTS_v1
import { crmUnified, useBfCrmBackend } from "@/components/crm/unified/crmUnifiedApi"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmContactApplications, contactRoleBadge } from "@/components/crm/unified/CrmContactPanel"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmTagEditor, useTagCatalogue } from "@/components/crm/unified/CrmTags"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmDuplicatesBanner } from "@/components/crm/unified/CrmDuplicates"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmAiSummary, CrmKsLicenseeCard } from "@/components/crm/unified/CrmAiSummary"; // BF_PORTAL_v856_CRM_UNIFY
import { NotifyContactButton } from "@/components/crm/NotifyContactButton"; // BF_PORTAL_NOTIFY_CONTACT_v627
import RetentionLock from "@/retention/RetentionLock"; // BF_PORTAL_v855_RETENTION
import { refusedDeleteMessage, useRetention } from "@/retention/retention"; // BF_PORTAL_v855_RETENTION

export default function ContactDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const crmBase = useCrmBase(); // BF_PORTAL_v850_KS_CRM
  const crmBackend = useBfCrmBackend(); // BF_PORTAL_v856_CRM_UNIFY
  const location = useLocation(); // BF_PORTAL_v856_CRM_UNIFY - "you opened a record that was merged into this one"
  const mergedFrom = (location.state as { mergedFrom?: string } | null)?.mergedFrom ?? null;
  const isKsCrm = crmBase.startsWith("/silo/ks"); // BF_PORTAL_v856_CRM_UNIFY - Keystone contacts are licensees, not borrowers
  const { catalogue: tagCatalogue } = useTagCatalogue(crmBackend); // BF_PORTAL_v856_CRM_UNIFY
  // BF_PORTAL_BLOCK_v_APOLLO_BI_ONLY_HOTFIX1 — Apollo enrichment is BI-only. Read
  // silo without the throwing useSilo() so a missing provider (e.g. in unit tests
  // or non-silo mounts) yields non-BI rather than crashing the page.
  const siloCtx = useContext(SiloContext);
  const isBiSilo = String((siloCtx as any)?.silo ?? "").toUpperCase() === "BI";
  const scope: Scope = { kind: "contact", id };
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const retention = useRetention("contact", id, refreshKey); // BF_PORTAL_v855_RETENTION
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
        // BF_PORTAL_v856_CRM_UNIFY - a merged record sends staff to the record it was merged into (following chains).
        if ((r as any)?.merged_into_id) {
          const s = await crmUnified(crmBackend).survivor(id).catch(() => null);
          if (!cancelled && s?.merged && s.id && s.id !== id) {
            navigate(`${crmBase}/contacts/${s.id}`, { replace: true, state: { mergedFrom: r?.name ?? "That contact" } });
            return;
          }
        }
        if (!cancelled) setContact(r);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contact.");
      }
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey, crmBackend, crmBase, navigate]);

  if (err) return <div style={{ padding: 24, color: "#b00020" }}>{err}</div>;
  if (!contact) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <>
      <div style={layout}>
      <aside style={rail}>
        <Link
          to={`${crmBase}/contacts`}
          style={{ color: "var(--ui-accent-fg)", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
        >← Back to contacts</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>{contact.name}</h2><span style={roleBadge} title={contactRoleBadge(contact as any).tip} data-testid="contact-role-badge">{contactRoleBadge(contact as any).label}</span></div>
        {contact.job_title && <div style={subtle}>{contact.job_title}</div>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ color: "#0091ae" }}>{contact.email}</a>
        )}
        {/* BF_PORTAL_v786_CRM_FIXES - action row wraps so buttons never overflow the card */}
        <div data-testid="contact-action-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={() => setEditOpen(true)} style={actionBtn}>Edit</button>
          {retention?.locked ? <RetentionLock status={retention} /> : (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this contact? This cannot be undone.")) return;
              try {
                await api.delete(`/api/crm/contacts/${id}`);
                navigate(`${crmBase}/contacts`);
              } catch (error: any) {
                setErr(refusedDeleteMessage(error) ?? error?.message ?? "Could not delete contact.");
              }
            }}
            style={{ ...actionBtn, borderColor: "#fecaca", color: "#b91c1c" }}
          >
            Delete
          </button>
          )}
          <NotifyContactButton contactId={id} contactName={contact.name} buttonStyle={actionBtn} onSent={() => setRefreshKey(k => k + 1)} />
        </div>
        <ActionBar
          scope={scope}
          contactEmail={contact.email}
          contactPhone={contact.phone}
          contactName={contact.name}
          onChanged={() => setRefreshKey(k => k + 1)}
        />
        <CrmContactApplications backend={crmBackend} contactId={id} />{/* BF_PORTAL_v856_CRM_UNIFY - business, amount, product, stage, submitted, partners */}
        <ContactApplicantFields applicationIds={contact.applicationIds} />
        <div style={fieldsBlock}>
          <Field label="Email"   value={contact.email ?? null} />
          <Field label="Phone"   value={contact.phone ?? null} />
          {/* BF_PORTAL_CONTACT_SECONDARY_v1 - second email/phone, shown only when present */}
          {contact.secondary_email && <Field label="Secondary email" value={contact.secondary_email} />}
          {contact.secondary_phone && <Field label="Secondary phone" value={contact.secondary_phone} />}
          <Field label="Status"  value={contact.lead_status ?? null} />
          <Field label="Stage"   value={contact.lifecycle_stage ?? null} />
          <Field label="Owner"   value={contact.owner_name ?? null} />
          <Field label="Created" value={contact.created_at ? new Date(contact.created_at).toLocaleString() : null} />
          {contact.source && <Field label="Source" value={contact.source} />}
        </div>
        <CrmTagEditor backend={crmBackend} entity="contact" id={id} tags={contact.tags} catalogue={tagCatalogue} onSaved={() => setRefreshKey((k) => k + 1)} />{/* BF_PORTAL_v856_CRM_UNIFY */}
      </aside>

      <main style={{ minWidth: 0 }}>
        {mergedFrom && (
          <div role="status" style={{ padding: "8px 12px", marginBottom: 12, borderRadius: 8, background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e3a8a" }}>
            {mergedFrom} was merged into this contact, so you are seeing the surviving record.
          </div>
        )}
        <CrmDuplicatesBanner backend={crmBackend} entity="contact" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY */}
        {/* BF_PORTAL_CONTACT_RECORD_TABS_v272 */}
        <ContactRecordTabs
          analytics={
            <>
              <CrmAiSummary backend={crmBackend} entity="contact" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY - above Stage history */}
              <ContactStageHistory contactId={id} showEmpty />
              <ContactJourney contactId={id} /> {/* BF_PORTAL_VISITOR_JOURNEY_v1 */}
              {/* BF_PORTAL_APOLLO_RETIRED_v784 - the BI Apollo marketing header and tab
                  called /api/v1/bi/contacts/:id/marketing and /enrich, both retired. */}
            </>
          }
          timeline={
            <>
              <UnifiedTimeline contactId={id} scope={scope} refreshKey={refreshKey} />
              <ContactDocuments contactId={id} refreshKey={refreshKey} /> {/* BF_PORTAL_CONTACT_DOCUMENTS_v1 */}
            </>
          }
        />
      </main>

      <aside style={rail}>
        <h3 style={{ marginTop: 0 }}>Company</h3>
        {contact.company_id && contact.company_name ? (
          <Link to={`${crmBase}/companies/${contact.company_id}`} style={{ color: "#0091ae" }}>
            {contact.company_name}
          </Link>
        ) : (
          <div style={subtle}>No associated company.</div>
        )}
        {/* BF_PORTAL_v856_CRM_UNIFY - possible duplicates now show as the banner at the top of the record. */}
        <ContactAdvisors applicationIds={contact.applicationIds} />
        {/* BF_PORTAL_CREDIT_READINESS_v1 - below Company and Advisors, hidden when empty */}
        {isKsCrm ? <CrmKsLicenseeCard backend={crmBackend} contactId={id} /> : <ContactCreditReadiness contactId={id} />}{/* BF_PORTAL_v856_CRM_UNIFY */}
        <ContactPartners applicationIds={contact.applicationIds} />
        <ContactMarketingSource contactId={id} />
        {/* BF_PORTAL_CONTACT_ONEDRIVE_v1 - per-contact OneDrive folder, below everything, BF only */}
        {!isBiSilo && <ContactOneDrive contactId={id} />}
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
          secondary_email: contact.secondary_email ?? "", // BF_PORTAL_CONTACT_SECONDARY_v1
          secondary_phone: contact.secondary_phone ?? "",
          lead_status: contact.lead_status ?? "",
          lifecycle_stage: contact.lifecycle_stage ?? "",
          job_title: contact.job_title ?? "",
          owner_id: contact.owner_id ?? "", // BF_PORTAL_BLOCK_v756_CONTACT_OWNER_EDIT
        }}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "tel" },
          { key: "secondary_email", label: "Secondary email", type: "email" },
          { key: "secondary_phone", label: "Secondary phone", type: "tel" },
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
  display: "grid", gridTemplateColumns: "260px minmax(0, 1fr) 220px", gap: 12,
  padding: 16, background: "var(--ui-surface-strong)", color: "var(--ui-text)",
};
const rail: CSSProperties = {
  background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16,
};
const subtle: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 12 };
const fieldsBlock: CSSProperties = { marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-border-soft)" };
const fieldLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const roleBadge: CSSProperties = { background: "var(--ui-surface-muted)", color: "var(--ui-text)", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 };


const actionBtn: CSSProperties = { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" };
