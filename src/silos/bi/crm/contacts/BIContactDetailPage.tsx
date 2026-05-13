// BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1
// BI-side mirror of src/pages/crm/contacts/ContactDetailPage.tsx.
// Same three-column layout, same light-theme HubSpot styling.
// Activity timeline reuses the v251 outreach activity endpoint.
// Edit modal + ActionBar + Delete are intentionally absent here;
// they ship in v208 once the matching BI-Server endpoints (PATCH
// contact, DELETE contact, send-email/sms staff actions) land.
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";

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

export default function BIContactDetailPage() {
  const { id = "" } = useParams();
  const [contact, setContact] = useState<BIContactDetail | null>(null);
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
        const contactRow: BIContactDetail | null = cRaw?.data ?? cRaw ?? null;
        setContact(contactRow);
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
  }, [id]);

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
            {contact.full_name || "(no name)"}
          </h2>
          <span style={roleBadge}>{formatStatus(role)}</span>
        </div>
        {contact.title && <div style={subtle}>{contact.title}</div>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ color: "#0091ae" }}>
            {contact.email}
          </a>
        )}
        <div style={fieldsBlock}>
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone_e164} />
          <Field
            label="Outreach status"
            value={contact.outreach_status ? contact.outreach_status.replace(/_/g, " ") : null}
          />
          <Field label="Owner" value={contact.outreach_owner_id} />
          <Field
            label="Last touched"
            value={
              contact.outreach_updated_at
                ? new Date(contact.outreach_updated_at).toLocaleString()
                : null
            }
          />
          <Field
            label="Created"
            value={new Date(contact.created_at).toLocaleString()}
          />
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div style={fieldsBlock}>
            <div style={fieldLabel}>Tags</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {contact.tags.map((t) => (
                <span key={t} style={tagBadge}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main style={mainCol} data-testid="bi-contact-main">
        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={{ margin: 0 }}>Activity</h3>
            <span style={badge}>{contact.activity_count}</span>
          </div>
          {events.length === 0 ? (
            <p style={{ color: "#7c98b6", padding: 12 }}>No activity logged yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {events.map((e) => (
                <li
                  key={e.id}
                  style={timelineRow}
                  data-testid="bi-contact-timeline-row"
                >
                  <div style={timelineWhen}>
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span style={timelineKind}>
                      {e.event_type.toUpperCase()}
                    </span>
                    {e.outcome && (
                      <span style={{ marginLeft: 8, color: "#516f90" }}>
                        · {e.outcome}
                      </span>
                    )}
                    {e.actor_name && (
                      <span style={{ marginLeft: 8, color: "#7c98b6" }}>
                        · {e.actor_name}
                      </span>
                    )}
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
