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
  ["creditScore", "Credit Score Range"],
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
  const partner =
    applicant.partner && typeof applicant.partner === "object"
      ? (applicant.partner as Record<string, any>)
      : null;

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--ui-border)", paddingTop: 12 }}>
      <div style={sectionLabel}>Applicant</div>
      <FieldRows data={applicant} />
      {partner && (
        <div style={{ marginTop: 12 }}>
          <div style={sectionLabel}>Partner</div>
          <FieldRows data={partner} />
        </div>
      )}
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
