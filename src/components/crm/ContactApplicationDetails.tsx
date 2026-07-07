import { useEffect, useState } from "react";
import { api } from "@/api";
import { fetchPortalApplication } from "@/api/applications";

// BF_PORTAL_CRM_CONTACT_PANELS_v1 — CRM contact detail panels:
//  • ContactApplicantFields (LEFT) renders the applicant's Step-4 fields from the linked
//    application's applicantInfo/applicantDetails (the data the client entered in wizard Step 4).
//  • ContactAdvisors (RIGHT) renders professional advisors from the professional_advisors
//    form-response. Both read-only; render only when data exists.

const STEP4_FIELDS: Array<[string, string]> = [
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["fullName", "Full Name"],
  ["title", "Title / Role"],
  ["email", "Email"],
  ["phone", "Mobile Phone"],
  ["homePhone", "Home Phone"],
  ["dob", "Date of Birth"],
  ["ssn", "SIN / SSN"],
  ["ownership", "Ownership %"],
  ["director", "Director"],
  ["officer", "Officer"],
  ["street", "Street Address"],
  ["city", "City"],
  ["state", "Province / State"],
  ["zip", "Postal / ZIP"],
  ["addressSince", "At This Address Since"],
  ["mailingStreet", "Mailing Address"],
  ["mailingCity", "Mailing City"],
  ["mailingState", "Mailing Province / State"],
  ["mailingZip", "Mailing Postal / ZIP"],
  ["ownRent", "Own or Rent"],
  ["propertyValue", "Property Value"],
  ["mortgageBalance", "Mortgage Value"],
  ["creditScoreRange", "Credit Score Range"],
  ["bankruptcyFiled", "Bankruptcy / Proposal Filed"],
  ["bankruptcyWhen", "Bankruptcy / Proposal When"],
  ["additionalShareholders", "Additional Shareholders"],
];

const sectionLabel = {
  fontSize: 12,
  fontWeight: 700 as const,
  color: "var(--ui-text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: 0.4,
  marginBottom: 6,
};

function pickApplicant(raw: unknown): Record<string, any> | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, any>;
  const flat =
    d.application && typeof d.application === "object" && !d.kyc && !d.businessDetails
      ? (d.application as Record<string, any>)
      : d;
  return (flat.applicantDetails ?? flat.applicantInfo ?? flat.applicant ?? null) as
    | Record<string, any>
    | null;
}

function FieldRows({ data }: { data: Record<string, any> }) {
  const rows = STEP4_FIELDS.map(([k, label]) => [label, data[k]] as const).filter(
    ([, v]) => v != null && String(v).trim() !== "",
  );
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map(([label, v]) => (
        <div
          key={label}
          style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "2px 0" }}
        >
          <span style={{ color: "var(--ui-text-muted)" }}>{label}</span>
          <span style={{ color: "var(--ui-text)", textAlign: "right" }}>{String(v)}</span>
        </div>
      ))}
    </>
  );
}

export function ContactApplicantFields({ applicationIds }: { applicationIds?: string[] }) {
  const appId = applicationIds?.[0] ?? null;
  const [applicant, setApplicant] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await fetchPortalApplication<unknown>(appId);
        if (!cancelled) setApplicant(pickApplicant(raw));
      } catch {
        if (!cancelled) setApplicant(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  if (!appId || !applicant) return null;
  const hasAny = STEP4_FIELDS.some(
    ([k]) => applicant[k] != null && String(applicant[k]).trim() !== "",
  );
  if (!hasAny) return null;
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--ui-border)", paddingTop: 12 }}>
      <div style={sectionLabel}>Applicant</div>
      <FieldRows data={applicant} />
    </div>
  );
}

// BF_PORTAL_CRM_CONTACT_PARTNERS_v1 - Partners render on the RIGHT rail (parallel
// to Company / Advisors), reading the linked application's applicant.partner.
export function ContactPartners({ applicationIds }: { applicationIds?: string[] }) {
  const appId = applicationIds?.[0] ?? null;
  const [partner, setPartner] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await fetchPortalApplication<unknown>(appId);
        const appl = pickApplicant(raw);
        const p = appl?.partner && typeof appl.partner === "object" ? (appl.partner as Record<string, any>) : null;
        if (!cancelled) setPartner(p);
      } catch {
        if (!cancelled) setPartner(null);
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);
  if (!appId || !partner) return null;
  const hasAny = STEP4_FIELDS.some(([k]) => partner[k] != null && String(partner[k]).trim() !== "");
  if (!hasAny) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Partners</h3>
      <FieldRows data={partner} />
    </div>
  );
}

const ADVISOR_ROLES: Array<{ key: string; label: string }> = [
  { key: "cpa", label: "Accountant" },
  { key: "attorney", label: "Lawyer" },
  { key: "insurance", label: "Insurance" },
  { key: "ar_credit_insurance", label: "A/R Credit Insurance" },
];

async function getDoc(appId: string, docType: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await api.get<{ item?: { data?: Record<string, unknown> | null } }>(
      `/api/applications/${encodeURIComponent(appId)}/form-responses/${encodeURIComponent(docType)}`,
    );
    return r?.item?.data ?? null;
  } catch {
    return null;
  }
}

export function ContactAdvisors({ applicationIds }: { applicationIds?: string[] }) {
  const appId = applicationIds?.[0] ?? null;
  const [advisors, setAdvisors] = useState<Record<string, Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      const adv = await getDoc(appId, "professional_advisors");
      if (!cancelled)
        setAdvisors((adv?.advisors as Record<string, Record<string, unknown>>) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  const advisorRows = advisors
    ? ADVISOR_ROLES.map((r) => ({ ...r, v: (advisors[r.key] ?? {}) as Record<string, unknown> })).filter(
        (r) => [r.v.firm, r.v.contact, r.v.email, r.v.phone].some((x) => String(x ?? "").trim() !== ""),
      )
    : [];

  if (!appId || advisorRows.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Advisors</h3>
      {advisorRows.map((r) => (
        <div key={r.key} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--ui-border-soft)" }}>
          <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>
            {r.label}
            {r.v.firm ? ` — ${String(r.v.firm)}` : ""}
          </div>
          {r.v.contact ? <div style={{ color: "var(--ui-text)" }}>{String(r.v.contact)}</div> : null}
          {r.v.email ? <div style={{ color: "#0091ae" }}>{String(r.v.email)}</div> : null}
          {r.v.phone ? <div style={{ color: "var(--ui-text)" }}>{String(r.v.phone)}</div> : null}
        </div>
      ))}
    </div>
  );
}

// BF_PORTAL_CRM_COMPANY_BUSINESS_v1 — CompanyBusinessFields (LEFT on the company
// card) renders the linked application's Step-3 business fields (md.company /
// md.business), parallel to ContactApplicantFields on the contact card.
const BUSINESS_LABELS: Record<string, string> = {
  legalName: "Legal Name",
  name: "Business Name",
  businessName: "Business Name",
  operatingName: "Operating Name",
  dba: "DBA",
  structure: "Business Structure",
  entityType: "Entity Type",
  industry: "Industry",
  naics: "NAICS",
  ein: "EIN",
  bn: "Business Number",
  businessNumber: "Business Number",
  incorporationDate: "Incorporated",
  dateEstablished: "Date Established",
  yearsInBusiness: "Years in Business",
  annualRevenue: "Annual Revenue",
  monthlyRevenue: "Monthly Revenue",
  numEmployees: "Employees",
  employees: "Employees",
  website: "Website",
  phone: "Business Phone",
  email: "Business Email",
  street: "Street Address",
  city: "City",
  state: "Province / State",
  province: "Province / State",
  zip: "Postal / ZIP",
  postalCode: "Postal / ZIP",
  country: "Country",
};

function humanizeKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function pickBusiness(raw: unknown): Record<string, any> | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, any>;
  const flat =
    d.application && typeof d.application === "object"
      ? (d.application as Record<string, any>)
      : d;
  const b = flat.businessDetails ?? flat.business ?? d.businessDetails ?? d.business ?? null;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, any>) : null;
}

function BusinessRows({ data }: { data: Record<string, any> }) {
  const isScalar = (v: any) =>
    v != null &&
    (typeof v === "string" || typeof v === "number" || typeof v === "boolean") &&
    String(v).trim() !== "";
  const known = Object.keys(BUSINESS_LABELS).filter((k) => isScalar(data[k]));
  const knownSet = new Set(known);
  const extra = Object.keys(data).filter((k) => !knownSet.has(k) && isScalar(data[k]));
  const seenLabel = new Set<string>();
  const rows = [...known, ...extra]
    .map((k) => [BUSINESS_LABELS[k] ?? humanizeKey(k), data[k]] as const)
    .filter(([label]) => {
      if (seenLabel.has(label)) return false;
      seenLabel.add(label);
      return true;
    });
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map(([label, v]) => (
        <div
          key={label}
          style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "2px 0" }}
        >
          <span style={{ color: "var(--ui-text-muted)" }}>{label}</span>
          <span style={{ color: "var(--ui-text)", textAlign: "right" }}>{String(v)}</span>
        </div>
      ))}
    </>
  );
}

export function CompanyBusinessFields({ applicationIds }: { applicationIds?: string[] }) {
  const appId = applicationIds?.[0] ?? null;
  const [business, setBusiness] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await fetchPortalApplication<unknown>(appId);
        if (!cancelled) setBusiness(pickBusiness(raw));
      } catch {
        if (!cancelled) setBusiness(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  if (!appId || !business) return null;
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--ui-border)", paddingTop: 12 }}>
      <div style={sectionLabel}>Business</div>
      <BusinessRows data={business} />
    </div>
  );
}

// Back-compat default export (renders both, for any other caller).
export default function ContactApplicationDetails(props: { applicationIds?: string[] }) {
  return (
    <>
      <ContactApplicantFields {...props} />
      <ContactAdvisors {...props} />
    </>
  );
}

// BF_PORTAL_AD_ATTRIBUTION_v1 - "Marketing Source" card. Shows the exact Google
// Ads campaign / ad group / keyword a contact clicked (resolved server-side from
// their gclid via click_view), falling back to raw UTM source for non-Google
// traffic. Reads GET /api/crm/contacts/:id/ad-attribution. Renders nothing when
// there's no attribution at all.
type AdAttribution = {
  source?: string | null; campaign_name?: string | null; ad_group_name?: string | null;
  keyword_text?: string | null; keyword_match_type?: string | null; click_date?: string | null;
  resolved?: boolean | null; resolve_error?: string | null;
};
type UtmAttribution = Record<string, unknown> | null;

export function ContactMarketingSource({ contactId }: { contactId?: string }) {
  const [ad, setAd] = useState<AdAttribution | null>(null);
  const [utm, setUtm] = useState<UtmAttribution>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ data?: { ad: AdAttribution | null; utm: UtmAttribution } } & { ad?: AdAttribution | null; utm?: UtmAttribution }>(
          `/api/crm/contacts/${contactId}/ad-attribution`,
        );
        const d = (r as { data?: { ad: AdAttribution | null; utm: UtmAttribution } })?.data ?? (r as { ad?: AdAttribution | null; utm?: UtmAttribution });
        if (!cancelled) { setAd(d?.ad ?? null); setUtm(d?.utm ?? null); setLoaded(true); }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (!loaded) return null;

  const row = (label: string, value: unknown) =>
    String(value ?? "").trim()
      ? (
        <div key={label} style={{ fontSize: 13, padding: "3px 0", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ color: "var(--ui-text-muted)" }}>{label}</span>
          <span style={{ color: "var(--ui-text)", fontWeight: 600, textAlign: "right" }}>{String(value)}</span>
        </div>
      )
      : null;

  // Resolved Google Ads click.
  if (ad && ad.resolved) {
    return (
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Marketing Source</h3>
        {row("Source", "Google Ads")}
        {row("Campaign", ad.campaign_name)}
        {row("Ad group", ad.ad_group_name)}
        {row("Keyword", ad.keyword_text ? `${ad.keyword_text}${ad.keyword_match_type ? ` (${String(ad.keyword_match_type).toLowerCase()})` : ""}` : null)}
        {row("Clicked", ad.click_date)}
      </div>
    );
  }

  // Google Ads click captured but not resolvable (older than 90 days or no match).
  if (ad && !ad.resolved && ad.source === "google_ads") {
    return (
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Marketing Source</h3>
        {row("Source", "Google Ads")}
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)", paddingTop: 4 }}>
          Clicked a Google ad; the specific campaign couldn't be resolved{ad.click_date ? ` (click ${ad.click_date})` : ""}.
        </div>
      </div>
    );
  }

  // Fallback: raw UTM from a non-Google source.
  if (utm) {
    const src = utm.utm_source ?? utm.source;
    const camp = utm.utm_campaign;
    const med = utm.utm_medium;
    if (String(src ?? "").trim() || String(camp ?? "").trim()) {
      return (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Marketing Source</h3>
          {row("Source", src)}
          {row("Medium", med)}
          {row("Campaign", camp)}
        </div>
      );
    }
  }

  return null;
}
