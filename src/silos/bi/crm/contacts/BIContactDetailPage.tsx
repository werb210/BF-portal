// BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1
// BI-side mirror of src/pages/crm/contacts/ContactDetailPage.tsx.
// Same three-column layout, same light-theme HubSpot styling.
// Activity timeline reuses the v251 outreach activity endpoint.
// Edit modal + ActionBar + Delete are intentionally absent here;
// they ship in v208 once the matching BI-Server endpoints (PATCH
// contact, DELETE contact, send-email/sms staff actions) land.
// BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
// v207 baseline page extended with Edit / Delete / Send SMS
// actions backed by BI-Server v255 endpoints.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import O365ComposeModal from "@/components/communications/O365ComposeModal";
// BF_PORTAL_BLOCK_v312_BI_CRM_ALIGN_v1
import { startOutboundPstn } from "@/dialer/actions";
import toast from "react-hot-toast";

// BF_PORTAL_BLOCK_v212_CONTACT_NAME_v1 — surface a clean display name when
// the persisted full_name is the auto-generated placeholder shape
// ("Applicant +14035551234" or "New applicant"). The v320 server backfill
// already replaced placeholders with guarantor_name where possible; this
// catches anything the backfill couldn't resolve so the page heading
// never reads "Applicant +<phone>".
function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^Applicant\s*\+/i.test(trimmed)) return true;
  if (/^New applicant/i.test(trimmed)) return true;
  return false;
}

function displayContactName(contact: { full_name: string | null; email: string | null; phone_e164: string | null }): string {
  if (!isPlaceholderName(contact.full_name)) return contact.full_name as string;
  // Prefer email local-part next (often readable), then phone, else generic.
  if (contact.email) {
    const local = contact.email.split("@")[0];
    if (local && local.length > 0) return local;
  }
  if (contact.phone_e164) return contact.phone_e164;
  return "(no name)";
}

type EngagementEvent = { id: string; event_type: string; source: string; apollo_message_id: string | null; sequence_name: string | null; occurred_at: string; metadata: Record<string, unknown> };

function EngagementSection({ contactId }: { contactId: string | undefined }) {
  const [events, setEvents] = useState<EngagementEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!contactId) { setEvents([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ events: EngagementEvent[] }>("/api/v1/bi/crm/contacts/" + encodeURIComponent(contactId) + "/engagement");
        if (!cancelled) setEvents(Array.isArray(r.events) ? r.events : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load engagement");
          setEvents([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);
  const icon = (t: string) => t === "opened" ? "👁" : t === "clicked" ? "🖱" : t === "replied" ? "↩" : t === "bounced" ? "✕" : t === "delivered" ? "✓" : "•";
  return (
    <section style={{ marginTop: 16, padding: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}>
      <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14 }}>Apollo engagement</h3>
      {error && <div style={{ color: "#b91c1c", fontSize: 12 }}>{error}</div>}
      {events === null && <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading</div>}
      {events !== null && events.length === 0 && <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>No engagement events yet.</div>}
      {events !== null && events.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 240, overflowY: "auto" }}>
          {events.map((e) => (
            <li key={e.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
              <span style={{ marginRight: 6 }}>{icon(e.event_type)}</span>
              <strong>{e.event_type}</strong>
              {e.sequence_name && <span style={{ color: "#64748b" }}> · {e.sequence_name}</span>}
              <span style={{ float: "right", color: "#94a3b8" }}>{new Date(e.occurred_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


type BIContactDetail = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
  title: string | null;
  tags: string[] | null;
  notes: string | null;
  outreach_status: string | null;
  outreach_owner_id: string | null;
  outreach_updated_at: string | null;
  company_id: string | null;
  company_name: string | null;
  company_operating_name: string | null;
  created_at: string;
  updated_at: string;
  activity_count: number;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: string;
  outcome: string | null;
  body: string | null;
  created_at: string;
};

// BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1 -- shape returned by
// BF-Server's GET /api/communications/timeline (see Block 10).
type BfTimelineEvent = {
  id: string;
  kind: "call" | "sms";
  direction: "inbound" | "outbound" | null;
  status: string | null;
  body: string | null;
  duration_seconds: number | null;
  from_number: string | null;
  to_number: string | null;
  silo: string;
  application_id: string | null;
  twilio_sid: string | null;
  staff_name: string | null;
  staff_user_id: string | null;
  created_at: string;
};

// BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1 -- normalized shape used by
// the merged timeline. Both bi_contact_activity rows and BF-Server
// timeline events collapse into this.
type UnifiedEvent = {
  uid: string;
  source: "bi" | "bf";
  label: string;
  meta_parts: string[];
  body: string | null;
  created_at: string;
};


function normalizeContact(raw: any): BIContactDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const tagsRaw = (raw as { tags?: unknown }).tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((tag): tag is string => typeof tag === "string")
    : null;
  return {
    id: String(raw.id ?? ""),
    full_name: typeof raw.full_name === "string" ? raw.full_name : null,
    email: typeof raw.email === "string" ? raw.email : null,
    phone_e164: typeof raw.phone_e164 === "string" ? raw.phone_e164 : null,
    title: typeof raw.title === "string" ? raw.title : null,
    tags,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    outreach_status: typeof raw.outreach_status === "string" ? raw.outreach_status : null,
    outreach_owner_id: typeof raw.outreach_owner_id === "string" ? raw.outreach_owner_id : null,
    outreach_updated_at: typeof raw.outreach_updated_at === "string" ? raw.outreach_updated_at : null,
    company_id: typeof raw.company_id === "string" ? raw.company_id : null,
    company_name: typeof raw.company_name === "string" ? raw.company_name : null,
    company_operating_name: typeof raw.company_operating_name === "string" ? raw.company_operating_name : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date(0).toISOString(),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date(0).toISOString(),
    activity_count: typeof raw.activity_count === "number" ? raw.activity_count : 0,
  };
}

export default function BIContactDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<BIContactDetail | null>(null);
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [composing, setComposing] = useState(false);
  const [smsBody, setSmsBody] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [emailComposeOpen, setEmailComposeOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    phone_e164: string;
    title: string;
    notes: string;
  }>({ full_name: "", email: "", phone_e164: "", title: "", notes: "" });

  // BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1 -- BF-Server timeline
  // (calls + SMS) merged into the contact's feed.
  const [bfEvents, setBfEvents] = useState<BfTimelineEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const [c, t] = await Promise.all([
          api(`/api/v1/bi/crm/contacts/${id}`),
          api(`/api/v1/bi/crm/outreach/contacts/${id}/activity`),
        ]);
        if (cancelled) return;
        const cRaw = c as any;
        const contactRow: BIContactDetail | null = normalizeContact(cRaw?.data ?? cRaw ?? null);
        setContact(contactRow);
        // BF_PORTAL_BLOCK_v208 — seed the form whenever fresh
        // contact data arrives so the inline editor reflects the
        // current server state.
        if (contactRow) {
          setForm({
            full_name: contactRow.full_name ?? "",
            email: contactRow.email ?? "",
            phone_e164: contactRow.phone_e164 ?? "",
            title: contactRow.title ?? "",
            notes: contactRow.notes ?? "",
          });
        }
        const tRaw = t as any;
        const evs: ActivityRow[] = Array.isArray(tRaw?.events) ? tRaw.events : [];
        setEvents(evs);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contact.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  // BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1
  // Second-phase fetch: BF-Server timeline keyed on phone. Depends
  // on the contact load having resolved phone_e164 (else there is
  // nothing to filter by, and we skip the round-trip entirely).
  // X-Silo header is auto-attached by the api() helper so the
  // server-side resolveSiloFromRequest scopes to the active silo.
  useEffect(() => {
    const phone = contact?.phone_e164;
    if (!phone) {
      setBfEvents([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await api<any>(
          `/api/communications/timeline?phone=${encodeURIComponent(phone)}`,
        );
        if (cancelled) return;
        const list: BfTimelineEvent[] = Array.isArray(r?.events)
          ? r.events
          : (Array.isArray(r?.data?.events) ? r.data.events : []);
        setBfEvents(list);
      } catch {
        if (!cancelled) setBfEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact?.phone_e164, refreshKey]);

  // BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1
  // Normalize both streams to UnifiedEvent and sort by created_at
  // desc. BI rows render with their existing event_type / outcome /
  // actor_name; BF rows compose meta from direction + duration +
  // status + staff_name. uid is source-prefixed so the two id
  // namespaces cannot collide.
  const unifiedEvents = useMemo<UnifiedEvent[]>(() => {
    const biRows: UnifiedEvent[] = events.map((e) => {
      const metaParts: string[] = [];
      if (e.outcome) metaParts.push(e.outcome);
      if (e.actor_name) metaParts.push(e.actor_name);
      return {
        uid: `bi:${e.id}`,
        source: "bi",
        label: (e.event_type ?? "EVENT").toUpperCase(),
        meta_parts: metaParts,
        body: e.body,
        created_at: e.created_at,
      };
    });

    const bfRows: UnifiedEvent[] = bfEvents.map((e) => {
      const metaParts: string[] = [];
      if (e.direction) metaParts.push(e.direction);
      if (e.kind === "call" && typeof e.duration_seconds === "number" && e.duration_seconds > 0) {
        const total = Math.max(0, Math.floor(e.duration_seconds));
        const mm = Math.floor(total / 60);
        const ss = total % 60;
        metaParts.push(`${mm}:${String(ss).padStart(2, "0")}`);
      }
      if (e.status) metaParts.push(e.status);
      if (e.staff_name) metaParts.push(e.staff_name);
      const dirSuffix = e.direction ? `_${e.direction.toUpperCase()}` : "";
      return {
        uid: `bf:${e.id}`,
        source: "bf",
        label: `${e.kind.toUpperCase()}${dirSuffix}`,
        meta_parts: metaParts,
        body: e.body,
        created_at: e.created_at,
      };
    });

    return [...biRows, ...bfRows].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [events, bfEvents]);

  // BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function saveEdit() {
    if (!contact) return;
    setSaving(true);
    setActionError(null);
    // Only send fields the user actually changed — skip unchanged
    // ones so a stale-form edit can't accidentally clear values.
    const patch: Record<string, unknown> = {};
    if (form.full_name !== (contact.full_name ?? "")) patch.full_name = form.full_name || null;
    if (form.email !== (contact.email ?? "")) patch.email = form.email || null;
    if (form.phone_e164 !== (contact.phone_e164 ?? "")) patch.phone_e164 = form.phone_e164 || null;
    if (form.title !== (contact.title ?? "")) patch.title = form.title || null;
    if (form.notes !== (contact.notes ?? "")) patch.notes = form.notes || null;
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }
    try {
      await api(`/api/v1/bi/crm/contacts/${id}`, {
        method: "PATCH",
        body: patch,
      } as any);
      setEditing(false);
      refresh();
    } catch (e: any) {
      setActionError(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact() {
    if (!window.confirm("Delete this contact? This cannot be undone.")) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api(`/api/v1/bi/crm/contacts/${id}`, { method: "DELETE" } as any);
      navigate("/silo/bi/crm");
    } catch (e: any) {
      setActionError(e?.message ?? "Delete failed.");
      setDeleting(false);
    }
  }

  async function sendSms() {
    const body = smsBody.trim();
    if (!body) return;
    setSmsSending(true);
    setActionError(null);
    try {
      // BF_PORTAL_BLOCK_BI_ROUND5_A_v1 -- explicit silo in the body
      // even though /api/v1/bi/... is already silo-encoded by URL.
      // When Block B lands and this call migrates to BF-Server's
      // /api/communications/sms, the silo body field + the X-Silo
      // header (auto-attached by api()) together route the activity
      // to the BI timeline.
      await api(`/api/communications/sms`, {
        method: "POST",
        body: { to: contact?.phone_e164, body, contact_id: id, silo: "BI" },
      } as any);
      toast.success("Sent");
      setSmsBody("");
      setComposing(false);
      refresh();
    } catch (e: any) {
      setActionError(e?.message ?? "SMS failed.");
    } finally {
      setSmsSending(false);
    }
  }

  if (err)
    return (
      <div style={{ padding: 24, color: "#b00020", background: "#fff", borderRadius: 8 }}>
        {err}
      </div>
    );
  if (loading || !contact)
    return (
      <div style={{ padding: 24, background: "#fff", borderRadius: 8 }}>Loading…</div>
    );

  const role = contact.outreach_status ?? "unknown";

  return (
    <div style={layout} data-testid="bi-contact-detail">
      <aside style={rail} data-testid="bi-contact-rail-left">
        <Link to="/silo/bi/crm" style={backLink}>
          ← Back to contacts
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>
            {displayContactName(contact)}
          </h2>
          <span style={roleBadge}>{formatStatus(role)}</span>
        </div>
        {contact.title && !editing && <div style={subtle}>{contact.title}</div>}
        {contact.email && !editing && (
          <button
            type="button"
            onClick={() => setEmailComposeOpen(true)}
            style={{ color: "#0091ae", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
          >
            {contact.email}
          </button>
        )}
        {!editing && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setEditing(true)} style={actionBtn} data-testid="bi-contact-edit-button">Edit</button>
            <button type="button" onClick={() => deleteContact()} disabled={deleting} style={{ ...actionBtn, borderColor: "#fecaca", color: "#b91c1c" }} data-testid="bi-contact-delete-button">{deleting ? "Deleting…" : "Delete"}</button>
            <button
              type="button"
              onClick={() => {
                if (!contact.phone_e164) return;
                void startOutboundPstn(contact.phone_e164, {
                  contactId: contact.id,
                  contactName: contact.full_name ?? undefined,
                  silo: "BI",
                  source: "bi-crm",
                });
              }}
              disabled={!contact.phone_e164}
              title={contact.phone_e164 ? "Call this contact" : "Contact has no phone number"}
              style={actionBtn}
              data-testid="bi-contact-call-button"
            >
              Call
            </button>
            <button
              type="button"
              onClick={() => {
                if (!contact.email) return;
                setEmailComposeOpen(true);
              }}
              disabled={!contact.email}
              title={contact.email ? "Compose email" : "Contact has no email address"}
              style={actionBtn}
              data-testid="bi-contact-email-button"
            >
              Email
            </button>
            <button type="button" onClick={() => setComposing((v) => !v)} disabled={!contact.phone_e164} title={contact.phone_e164 ? "Send a free-text SMS" : "Contact has no phone number"} style={actionBtn} data-testid="bi-contact-sms-button">{composing ? "Cancel SMS" : "Send SMS"}</button>
          </div>
        )}
        {actionError && <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }} role="status">{actionError}</div>}
        {composing && !editing && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eaf0f6" }} data-testid="bi-contact-sms-composer">
            <div style={fieldLabel}>SMS to {contact.phone_e164}</div>
            <textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={4} placeholder="Type your message…" style={{ width: "100%", marginTop: 4, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000", fontSize: 13 }} aria-label="SMS body" />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => void sendSms()} disabled={smsSending || !smsBody.trim()} style={{ ...actionBtn, background: "#0d9b6c", color: "#fff", borderColor: "#0d9b6c" }}>{smsSending ? "Sending…" : "Send"}</button>
              <button type="button" onClick={() => { setComposing(false); setSmsBody(""); }} style={actionBtn}>Cancel</button>
            </div>
          </div>
        )}
        {editing ? (
          <div style={fieldsBlock} data-testid="bi-contact-edit-form">
            <FieldEdit label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <FieldEdit label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FieldEdit label="Phone" type="tel" value={form.phone_e164} onChange={(v) => setForm({ ...form, phone_e164: v })} />
            <FieldEdit label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <div style={{ marginBottom: 8 }}>
              <div style={fieldLabel}>Notes</div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} style={{ width: "100%", marginTop: 4, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000", fontSize: 13 }} aria-label="Notes" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => void saveEdit()} disabled={saving} style={{ ...actionBtn, background: "#0d9b6c", color: "#fff", borderColor: "#0d9b6c" }}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => { setEditing(false); setActionError(null); setForm({ full_name: contact.full_name ?? "", email: contact.email ?? "", phone_e164: contact.phone_e164 ?? "", title: contact.title ?? "", notes: contact.notes ?? "" }); }} disabled={saving} style={actionBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={fieldsBlock}>
            <Field label="Email" value={contact.email} />
            <Field label="Phone" value={contact.phone_e164} />
            <Field label="Outreach status" value={contact.outreach_status ? contact.outreach_status.replace(/_/g, " ") : null} />
            <Field label="Owner" value={contact.outreach_owner_id} />
            <Field label="Last touched" value={contact.outreach_updated_at ? new Date(contact.outreach_updated_at).toLocaleString() : null} />
            <Field label="Created" value={new Date(contact.created_at).toLocaleString()} />
          </div>
        )}
        <TagEditor contact={contact} onSaved={refresh} />
      </aside>

      <main style={mainCol} data-testid="bi-contact-main">
        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={{ margin: 0 }}>Activity</h3>
            {/* BF_PORTAL_BLOCK_BI_ROUND5_D_TIMELINE_v1 -- badge now
                counts the merged feed (bi_contact_activity +
                BF-Server timeline) instead of only BI-Server's
                contact.activity_count, so the number matches the
                rendered list. */}
            <span style={badge}>{unifiedEvents.length}</span>
          </div>
          {unifiedEvents.length === 0 ? (
            <p style={{ color: "#7c98b6", padding: 12 }}>No activity logged yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {unifiedEvents.map((e) => (
                <li
                  key={e.uid}
                  style={timelineRow}
                  data-testid="bi-contact-timeline-row"
                  data-source={e.source}
                >
                  <div style={timelineWhen}>
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span style={timelineKind}>{e.label}</span>
                    {e.meta_parts.map((part, idx) => (
                      <span key={idx} style={{ marginLeft: 8, color: "#516f90" }}>
                        · {part}
                      </span>
                    ))}
                  </div>
                  {e.body && (
                    <div style={{ marginTop: 4, color: "#33475b" }}>{e.body}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {contact.notes && (
          <div style={{ ...panel, marginTop: 16 }}>
            <div style={panelHeader}>
              <EngagementSection contactId={contact?.id} />
              <h3 style={{ margin: 0 }}>Notes</h3>
            </div>
            <p
              style={{
                color: "#33475b",
                padding: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {contact.notes}
            </p>
          </div>
        )}
      </main>

      <aside style={rail} data-testid="bi-contact-rail-right">
        <h3 style={{ marginTop: 0 }}>Company</h3>
        {contact.company_id && contact.company_name ? (
          <>
            <Link
              to={`/silo/bi/crm/companies/${contact.company_id}`}
              style={{ color: "#0091ae" }}
              data-testid="bi-contact-company-link"
            >
              {contact.company_name}
            </Link>
            {contact.company_operating_name &&
              contact.company_operating_name !== contact.company_name && (
                <div style={subtle}>o/a {contact.company_operating_name}</div>
              )}
          </>
        ) : (
          <div style={subtle}>No associated company.</div>
        )}
      </aside>
      <O365ComposeModal
        open={emailComposeOpen}
        initialTo={contact.email ?? ""}
        logScope={{ kind: "contact", id: contact.id }}
        onClose={() => setEmailComposeOpen(false)}
        onSent={() => { toast.success("Sent"); refresh(); }}
      />
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

// BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
function FieldEdit(props: { label: string; value: string; type?: string; onChange: (next: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{props.label}</div>
      <input type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)} style={{ width: "100%", marginTop: 4, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000", fontSize: 13 }} aria-label={props.label} />
    </div>
  );
}

function TagEditor({ contact, onSaved }: { contact: { id: string; tags: string[] | null }; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setText((contact.tags ?? []).join(", "));
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setText((contact.tags ?? []).join(", "));
    setError(null);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const parsed = text.split(",").map((part) => part.trim()).filter(Boolean);
      await api(`/api/v1/bi/crm/contacts/${encodeURIComponent(contact.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ tags: parsed.length > 0 ? parsed : null }),
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={fieldsBlock}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={fieldLabel}>Tags</div>
        <button type="button" onClick={startEdit} disabled={saving || editing} style={actionBtn}>Edit</button>
      </div>
      {editing ? (
        <>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            placeholder="vip, warm lead, do not call"
            style={{ width: "100%", marginTop: 6, padding: 8, border: "1px solid rgba(148, 163, 184, 0.55)", borderRadius: 4, background: "rgba(15, 23, 42, 0.6)", color: "#e2e8f0", fontSize: 13 }}
            aria-label="Edit tags"
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => void save()} disabled={saving} style={{ ...actionBtn, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" }}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={cancelEdit} disabled={saving} style={actionBtn}>Cancel</button>
          </div>
          {error && <div style={{ marginTop: 8, color: "#f87171", fontSize: 12 }}>{error}</div>}
        </>
      ) : contact.tags && contact.tags.length > 0 ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
          {contact.tags.map((t) => (
            <span key={t} style={tagBadge}>{t}</span>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>No tags</div>
      )}
    </div>
  );
}

function formatStatus(value: string) {
  if (value === "unknown") return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px 1fr 320px",
  gap: 16,
  padding: 16,
  background: "#fff",
  color: "#000",
  borderRadius: 8,
};
const rail: CSSProperties = {
  background: "#fff",
  border: "1px solid #eaf0f6",
  borderRadius: 6,
  padding: 16,
};
const mainCol: CSSProperties = { minWidth: 0 };
const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid #eaf0f6",
  borderRadius: 6,
  padding: 0,
};
const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #eaf0f6",
  background: "#f5f8fa",
};
const badge: CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};
const backLink: CSSProperties = {
  color: "#1d4ed8",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 12,
};
const subtle: CSSProperties = {
  color: "#516f90",
  fontSize: 13,
  marginBottom: 12,
};
const fieldsBlock: CSSProperties = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid #eaf0f6",
};
const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "#7c98b6",
  textTransform: "uppercase",
};
const roleBadge: CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};
// BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
const actionBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};
const tagBadge: CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
};
const timelineRow: CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #eaf0f6",
  fontSize: 13,
};
const timelineWhen: CSSProperties = { color: "#7c98b6", fontSize: 12 };
const timelineKind: CSSProperties = {
  color: "#33475b",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: 0.5,
};
