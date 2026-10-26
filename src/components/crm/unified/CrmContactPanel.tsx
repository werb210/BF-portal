// BF_PORTAL_v856_CRM_UNIFY - the contact's left panel, the same in every CRM (BF, SLF and KS from BF-Server, BI from
// BI-Server): each application with business, amount, product, stage, submitted date, partners / guarantors and a link
// to it; unfinished drafts are only counted. Then the advisors linked to the contact (from the Professional Advisors
// form), or the clients the contact advises. And the role badge next to the name, which says what the person is.
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { crmUnified, formatPhone, type CrmBackend, type PanelApplication, type RelatedPerson } from "./crmUnifiedApi";

const money = (n: number | null) => (n == null ? null : `$${Math.round(n).toLocaleString("en-US")}`);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : null);
const pretty = (v: string | null) => (v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null);

export function CrmContactApplications({ backend, contactId }: { backend: CrmBackend; contactId: string }) {
  const [apps, setApps] = useState<PanelApplication[] | null>(null);
  const [drafts, setDrafts] = useState(0);
  const [related, setRelated] = useState<RelatedPerson[]>([]);
  useEffect(() => {
    let alive = true;
    const api = crmUnified(backend);
    api.contactApplications(contactId)
      .then((r) => { if (alive) { setApps(Array.isArray(r?.applications) ? r.applications : []); setDrafts(Number(r?.drafts ?? 0)); } })
      .catch(() => { if (alive) setApps([]); });
    api.contactRelated(contactId)
      .then((r) => { if (alive) setRelated(Array.isArray(r) ? r : []); })
      .catch(() => { if (alive) setRelated([]); });
    return () => { alive = false; };
  }, [backend, contactId]);
  if (!apps) return null;
  if (!apps.length && !related.length) return null;
  const advisors = related.filter((r) => r.direction === "advisor");
  const clients = related.filter((r) => r.direction === "client");
  return (
    <section data-testid="crm-contact-applications" style={section}>
      {apps.length > 0 && <h4 style={heading}>{apps.length === 1 ? "Application" : `Applications (${apps.length})`}</h4>}
      {apps.map((a) => (
        <div key={a.id} style={card}>
          <Link to={a.link} style={{ color: "#1d4ed8", fontWeight: 700 }}>{a.business || "Application"}</Link>
          <Row label="Amount" value={money(a.amount)} />
          <Row label="Product" value={pretty(a.product)} />
          <Row label="Stage" value={a.submitted ? pretty(a.stage) : `Not submitted${a.stage ? ` (${pretty(a.stage)})` : ""}`} />
          <Row label="Submitted" value={a.submitted ? day(a.submittedAt) : null} />
          {a.role !== "applicant" && <Row label="Their role" value={pretty(a.role)} />}
          {a.partners.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={label}>Partners and guarantors</div>
              {a.partners.map((p, i) => (
                <div key={`${p.contactId ?? p.email ?? p.name}-${i}`} style={{ fontSize: 13 }}>
                  {p.contactId ? <Link to={`${backend.linkBase}/contacts/${p.contactId}`} style={{ color: "#1d4ed8" }}>{p.name}</Link> : <span>{p.name}</span>}
                  <span style={muted}> {p.role === "guarantor" ? "guarantor" : "partner"}</span>
                  {p.phone ? <span style={muted}> {formatPhone(p.phone)}</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {drafts > 0 && <div style={{ ...muted, fontSize: 12 }}>{drafts} unfinished draft{drafts === 1 ? "" : "s"} not shown.</div>}
      {advisors.length > 0 && <PeopleList title="Advisors" people={advisors} backend={backend} />}
      {clients.length > 0 && <PeopleList title="Advisor to" people={clients} backend={backend} />}
    </section>
  );
}

function PeopleList({ title, people, backend }: { title: string; people: RelatedPerson[]; backend: CrmBackend }) {
  return (
    <div style={{ marginTop: 8 }}>
      <h4 style={heading}>{title}</h4>
      {people.map((p) => (
        <div key={p.contactId} style={{ fontSize: 13, marginBottom: 4 }}>
          <Link to={`${backend.linkBase}/contacts/${p.contactId}`} style={{ color: "#1d4ed8", fontWeight: 600 }}>{p.name}</Link>
          {p.detail ? <span style={muted}> {p.detail}</span> : null}
          {p.company ? <div style={muted}>{p.company}</div> : null}
        </div>
      ))}
    </div>
  );
}

function Row({ label: l, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 13 }}>
      <span style={{ ...label, minWidth: 74 }}>{l}</span>
      <span>{value}</span>
    </div>
  );
}

const ADVISOR_TAGS = new Set(["accountant", "lawyer", "insurance", "ar_credit_insurance", "advisor"]);

/** The badge next to a contact's name. contacts.role defaults to "unknown", which told staff nothing: say what the
 *  person is instead (their application role, else partner / advisor / lender / broker from their tags, else their
 *  lead status), with a tooltip that explains where it comes from. */
export function contactRoleBadge(c: { role?: string | null; tags?: string[] | null; lead_status?: string | null; lifecycle_stage?: string | null; applicationIds?: string[] | null }): { label: string; tip: string } {
  const role = String(c.role ?? "").toLowerCase();
  const tags = new Set((c.tags ?? []).map((t) => String(t).toLowerCase()));
  if (role === "applicant" || (c.applicationIds?.length ?? 0) > 0) return { label: "Applicant", tip: "Started or submitted an application." };
  if (role === "partner" || tags.has("partner")) return { label: "Partner", tip: "Named as a partner or owner on an application." };
  if (role === "guarantor" || tags.has("guarantor")) return { label: "Guarantor", tip: "Named as a guarantor on an application." };
  if (Array.from(tags).some((t) => ADVISOR_TAGS.has(t))) return { label: "Advisor", tip: "A client's accountant, lawyer, insurance or other advisor." };
  if (tags.has("lender")) return { label: "Lender", tip: "Tagged Lender." };
  if (tags.has("broker")) return { label: "Broker", tip: "Tagged Broker." };
  if (tags.has("referrer")) return { label: "Referrer", tip: "Tagged Referrer." };
  const status = String(c.lead_status ?? c.lifecycle_stage ?? "").trim();
  if (status) return { label: status.charAt(0).toUpperCase() + status.slice(1), tip: "Lead status: no application, partner or advisor link yet." };
  return { label: "Contact", tip: "No application, partner or advisor link yet." };
}

const section: CSSProperties = { marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--ui-border-soft)" };
const heading: CSSProperties = { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "var(--ui-text)" };
const card: CSSProperties = { border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 8, marginBottom: 8, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
const label: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
