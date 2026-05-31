// BF_PORTAL_BLOCK_v174_APPLICATION_TAB_SEMANTIC_GROUPS_v1
// BF_PORTAL_BLOCK_v175_CALL_CLIENT_BUTTON_v1
// BF_PORTAL_BLOCK_v176_APPLICATION_TAB_FIELD_COVERAGE_v1
// Application tab — semantic groups, full field coverage. Reads the flat
// /api/applications/:id/details shape: {overview, businessDetails,
// applicantDetails, owners, financialProfile, fundingRequest, rawPayload}.
//
// v176 adds:
//   - "Financial Profile" section surfacing the 11 fp.* fields v174 dropped
//     (industry, lookingFor, salesHistory/yearsInBusiness, arBalance,
//     fixedAssets, accountsReceivable, availableCollateral, revenueLast12Months,
//     businessLocation, fundingAmount, plus revenue copies)
//   - Cross-section reads: Industry pulls from fp.industry as fallback,
//     Entity Type from business.businessStructure, Time-in-Business from
//     fp.yearsInBusiness, Applicant home address from applicant.street.
//   - DBA detection: shows business.companyName / businessName when distinct
//     from legalName (the wizard sometimes stamps the same value to all three).
//   - Partner detection: flat applicant.partner* keys + hasMultipleOwners gate
//     (the wizard does NOT nest partner — submitNormalize.ts uses flat fields).
//   - Ownership % for the applicant.
import type { CSSProperties, ReactNode } from "react";

type AnyRecord = Record<string, any>;
type Props = { application: AnyRecord | null };

function asObject(v: unknown): AnyRecord {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as AnyRecord) : {};
}

function pickPartner(...sources: any[]): AnyRecord | null {
  for (const s of sources) {
    if (s && typeof s === "object" && !Array.isArray(s)) {
      const obj = s as AnyRecord;
      if (Object.values(obj).some((v) => v !== null && v !== undefined && v !== "")) {
        return obj;
      }
    }
  }
  return null;
}

// Read the flat partner shape the wizard actually emits
// (applicant.partnerFirstName, applicant.partnerLastName, ...).
function readFlatPartner(applicant: AnyRecord, fdApplicant: AnyRecord): AnyRecord | null {
  const get = (key: string) => applicant[key] ?? fdApplicant[key];
  const flat: AnyRecord = {
    firstName: get("partnerFirstName"),
    lastName: get("partnerLastName"),
    email: get("partnerEmail"),
    phone: get("partnerPhone"),
    dateOfBirth: get("partnerDob") ?? get("partnerDateOfBirth"),
    ssn: get("partnerSsn") ?? get("partnerSin"),
    ownership: get("partnerOwnership") ?? get("partnerOwnershipPercent"),
    title: get("partnerTitle"),
    address: get("partnerAddress") ?? get("partnerStreet"),
    city: get("partnerCity"),
    state: get("partnerState") ?? get("partnerProvince"),
    zip: get("partnerZip") ?? get("partnerPostalCode"),
    creditScore: get("partnerCreditScore"),
  };
  const hasAny = Object.values(flat).some((v) => v !== null && v !== undefined && v !== "");
  return hasAny ? flat : null;
}

export default function ApplicationTab({ application }: Props) {
  if (!application) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading application…</div>
      </div>
    );
  }

  const overview = asObject(application.overview);
  const business = asObject(application.businessDetails ?? application.business);
  const applicant = asObject(application.applicantDetails ?? application.applicantInfo);
  const fp = asObject(application.financialProfile ?? application.kyc);
  const owners: AnyRecord[] = Array.isArray(application.owners) ? application.owners : [];
  const raw = asObject(application.rawPayload);
  const fd = asObject(raw.formData);
  const fdApplicant = asObject(fd.applicant);
  const fdBusiness = asObject(fd.business);
  const fundingRequest = asObject(application.fundingRequest);

  // Partner — try nested shape first (server may populate metadata.partner),
  // fall back to flat applicant.partner* keys (what the wizard actually emits).
  const nestedPartner = pickPartner(raw.partner, raw.applicant?.partner, fdApplicant.partner);
  const flatPartner = readFlatPartner(applicant, fdApplicant);
  const partner = nestedPartner ?? flatPartner;
  const hasPartners =
    applicant.hasMultipleOwners === true ||
    fdApplicant.hasMultipleOwners === true ||
    applicant.hasPartners === true ||
    fdApplicant.hasPartners === true ||
    Boolean(partner);

  const businessName = fmt(
    business.legalName ?? business.name ?? application.applicant ?? "Unknown business"
  );

  // BF_PORTAL_BLOCK_v177_MULTI_LEG_BANNER_v1
  // Detect whether this application is a child leg in a multi-leg structure.
  // capital_and_equipment_leg flag set by the submit-time fan-out (BLOCK_v85).
  // closing_cost_companion / kind=closing_costs set by the Step-2 modal flow
  // (BLOCK_v125a). Both copy parent_application_id into metadata.
  const legParentId = typeof raw.parent_application_id === "string" ? raw.parent_application_id : null;
  const legInfo: { kind: "equipment" | "closing_costs"; parentId: string | null } | null =
    raw.capital_and_equipment_leg === true || raw.leg_category === "EQUIPMENT"
      ? { kind: "equipment", parentId: legParentId }
      : raw.closing_cost_companion === true || raw.kind === "closing_costs"
      ? { kind: "closing_costs", parentId: legParentId }
      : null;

  // DBA: only show if it's a meaningfully different value than the legal name.
  const dbaCandidate =
    business.dba ?? business.dbaName ?? business.operatingName ?? business.companyName ?? business.businessName ?? null;
  const dba = dbaCandidate && String(dbaCandidate).trim() && String(dbaCandidate).trim() !== String(business.legalName ?? business.name ?? "").trim()
    ? String(dbaCandidate)
    : null;

  // Call Client button (v225 -- tel: handoff to OS dialer)
  const applicantName = joinName(applicant) || businessName;
  const phoneRaw = applicant.phone ?? applicant.phoneNumber ?? null;
  const phone = phoneRaw ? String(phoneRaw).trim() : null;
  const applicationId = String(application.id ?? "");
  function callClient() {
    if (!phone) return;
    // v697: actually place the call (was only opening the panel, never dialing).
    import("@/dialer/actions").then(({ startOutboundPstn }) => {
      void startOutboundPstn(phone, {
        applicationId, applicationName: businessName,
        contactName: applicantName, source: "application",
      });
    });
  }

  return (
    <div style={styles.page}>
      {legInfo && <LegBanner kind={legInfo.kind} parentId={legInfo.parentId} />}
      <div style={styles.headerRow}>
        <div style={{ minWidth: 0 }}>
          <h2 style={styles.title}>{businessName}</h2>
          <div style={styles.subtitle}>
            {fmt(application.status, "—")} · Submitted {fmtDate(application.submittedAt)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={callClient}
            disabled={!phone}
            title={phone ? `Call ${phone}` : "No phone number on file"}
            style={phone ? styles.callButton : styles.callButtonDisabled}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span>Call Client</span>
          </button>
          <span style={styles.statusPill}>{fmt(application.stage, "—")}</span>
        </div>
      </div>

      <SectionGroup title="Funding">
        <Field label="Requested Amount" value={fmtMoney(overview.requestedAmount ?? fundingRequest.amount ?? fp.fundingAmount)} highlight />
        <Field label="Use of Funds" value={prettyEnum(fp.purposeOfFunds ?? fp.purpose ?? fundingRequest.purpose ?? raw.purposeOfFunds)} />
        {/* BF_PORTAL_BLOCK_v185_LEG_LOOKING_FOR_OVERRIDE_v1
            Equipment legs and closing-cost companions inherit metadata.kyc.lookingFor
            from the parent (often "BOTH"), which contradicts the leg banner above.
            Override the displayed value when legInfo is set. */}
        <Field
          label="Looking For"
          value={
            legInfo?.kind === "equipment"      ? "Equipment Financing" :
            legInfo?.kind === "closing_costs"  ? "Closing-Costs Financing" :
            prettyEnum(fp.lookingFor ?? fp.fundingType ?? raw.fundingType ?? fdApplicant.lookingFor)
          }
        />
        {/* BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — Product Category lifted from removed PRODUCT section */}
        <Field label="Product Category" value={prettyEnum(overview.productCategory ?? application.productCategory ?? raw.product_category)} />
        <Field label="Stage" value={fmt(application.stage)} />
        <Field label="Submitted" value={fmtDate(application.submittedAt)} />
      </SectionGroup>

      <SectionGroup title="Business">
        <Field label="Legal Business Name" value={fmt(business.legalName ?? business.name)} />
        <Field label="Operating / DBA Name" value={fmt(dba)} />
        <Field label="Business Address" value={fmt(business.address ?? business.streetAddress ?? business.businessAddress ?? business.street)} />
        <Field label="City" value={fmt(business.city)} />
        <Field label="Province / State" value={fmt(business.state ?? business.province ?? business.region)} />
        <Field label="Postal / ZIP" value={fmt(business.postalCode ?? business.zip ?? business.zipCode)} />
        <Field label="Phone" value={fmt(business.phone ?? business.phoneNumber)} />
        {/* BF_PORTAL_BLOCK_v608_THREE_FIXES_v1 — Business Email removed per Todd. */}
        <Field label="Website" value={business.website ? <Anchor href={String(business.website)} /> : "—"} />
        <Field label="Industry" value={fmt(business.industry ?? fp.industry)} />
        <Field label="Entity Type" value={prettyEnum(business.businessStructure ?? business.entityType ?? business.businessType)} />
        <Field label="Start Date" value={fmtDate(business.startDate)} />
        <Field label="Time in Business" value={fmt(business.timeInBusiness ?? fp.yearsInBusiness ?? fp.salesHistory)} />
        <Field label="Number of Employees" value={fmt(business.numberOfEmployees ?? business.employees)} />
        <Field label="Annual Revenue" value={fmtMoney(business.annualRevenue ?? fp.annualRevenue ?? business.estimatedRevenue ?? fp.revenueLast12Months)} />
        <Field label="Monthly Revenue" value={fmtMoney(business.monthlyRevenue ?? fp.monthlyRevenue)} />
        {/* BF_PORTAL_BLOCK_v608_THREE_FIXES_v1 — Tax ID / EIN removed per Todd. */}
      </SectionGroup>

      <SectionGroup title="Financial Profile">
        <Field label="Annual Revenue" value={fmtMoney(fp.annualRevenue ?? business.annualRevenue)} />
        <Field label="Monthly Revenue" value={fmtMoney(fp.monthlyRevenue ?? business.monthlyRevenue)} />
        <Field label="Revenue Last 12 Months" value={fmtMoney(fp.revenueLast12Months)} />
        <Field label="Sales History" value={fmt(fp.salesHistory ?? fp.salesHistoryYears)} />
        <Field label="Years in Business" value={fmt(fp.yearsInBusiness ?? fp.salesHistoryYears)} />
        <Field label="A/R Balance" value={fmtMoney(fp.arBalance ?? fp.accountsReceivable)} />
        <Field label="Accounts Receivable" value={fmtMoney(fp.accountsReceivable ?? fp.arBalance)} />
        <Field label="Fixed Assets" value={fmtMoney(fp.fixedAssets)} />
        <Field label="Available Collateral" value={fmtMoney(fp.availableCollateral)} />
        <Field label="Funding Amount" value={fmtMoney(fp.fundingAmount)} />
        <Field label="Business Location" value={fmt(fp.businessLocation)} />
      </SectionGroup>

      <SectionGroup title="Applicant">
        <Field label="Name" value={fmt(joinName(applicant) || "—")} />
        <Field label="Title" value={fmt(applicant.title)} />
        <Field label="Phone" value={fmt(applicant.phone ?? applicant.phoneNumber)} />
        <Field label="Email" value={applicant.email ? <Email value={String(applicant.email)} /> : "—"} />
        <Field label="Date of Birth" value={maskDob(applicant.dateOfBirth ?? applicant.dob)} />
        <Field label="SSN / SIN" value={maskSsn(applicant.ssn ?? applicant.sin ?? applicant.socialSecurityNumber)} />
        <Field label="Home Address" value={fmt(applicant.street ?? applicant.address ?? applicant.streetAddress ?? applicant.homeAddress)} />
        <Field label="City" value={fmt(applicant.city)} />
        <Field label="Province / State" value={fmt(applicant.state ?? applicant.province)} />
        <Field label="Postal / ZIP" value={fmt(applicant.postalCode ?? applicant.zip)} />
        <Field label="Ownership %" value={fmtPercent(applicant.ownership ?? applicant.ownershipPercent)} />
        <Field label="Credit Score" value={fmt(applicant.creditScore ?? fp.creditScore)} />
      </SectionGroup>

      {hasPartners && partner && (
        <SectionGroup title="Partner">
          <Field label="Name" value={fmt(joinName(partner) || "—")} />
          <Field label="Title" value={fmt(partner.title)} />
          <Field label="Phone" value={fmt(partner.phone ?? partner.phoneNumber)} />
          <Field label="Email" value={partner.email ? <Email value={String(partner.email)} /> : "—"} />
          <Field label="Date of Birth" value={maskDob(partner.dateOfBirth ?? partner.dob)} />
          <Field label="SSN / SIN" value={maskSsn(partner.ssn ?? partner.sin)} />
          <Field label="Home Address" value={fmt(partner.address ?? partner.street ?? partner.streetAddress)} />
          <Field label="City" value={fmt(partner.city)} />
          <Field label="Province / State" value={fmt(partner.state ?? partner.province)} />
          <Field label="Postal / ZIP" value={fmt(partner.zip ?? partner.postalCode)} />
          <Field label="Ownership %" value={fmtPercent(partner.ownership ?? partner.ownershipPercent)} />
          <Field label="Credit Score" value={fmt(partner.creditScore)} />
        </SectionGroup>
      )}

      {/* BF_PORTAL_BLOCK_54_BI_DETAIL_OWNERSHIP_DEMO_v1 — Ownership section removed per spec; data lives in Applicant/Partner. */}

      <div style={styles.footer}>
        Submitted by the applicant. Read-only — to amend, request the client update via the mini-portal.
      </div>
    </div>
  );
}

function joinName(p: any): string {
  if (!p || typeof p !== "object") return "";
  const first = p.firstName ?? p.first_name ?? "";
  const last = p.lastName ?? p.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || p.fullName || p.full_name || p.name || "";
}

function fmt(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

// BF_PORTAL_BLOCK_v190_APP_TAB_PRETTY_ENUMS_v1
// Convert UPPER_SNAKE_CASE enum strings to "Title Case With Spaces" for display.
// Leaves already-mixed-case strings (e.g. "Construction") alone.
function prettyEnum(value: unknown, fallback: string = "\u2014"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  // If already mixed case, return as-is (preserves human-typed input).
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
  // Otherwise treat as UPPER_SNAKE / lower_snake / kebab-case → Title Case.
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}


function fmtMoney(v: unknown, fallback = "—"): string {
  let n = NaN;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") n = Number(v.replace(/[^0-9.\-]/g, ""));
  return !Number.isFinite(n) || n <= 0 ? fallback : `$${Math.round(n).toLocaleString()}`;
}

function fmtPercent(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return fallback;
  return `${n}%`;
}

function fmtDate(v: unknown, fallback = "—"): string {
  if (typeof v !== "string" || !v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? fallback
    : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function maskSsn(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  const digits = String(v).replace(/\D/g, "");
  if (digits.length === 0) return fallback;
  if (digits.length < 4) return "•".repeat(9);
  return `•••-••-${digits.slice(-4)}`;
}

function maskDob(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  const s = String(v);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `••/••/${d.getFullYear()}`;
  }
  const yr = s.match(/(\d{4})/);
  return yr ? `••/••/${yr[1]}` : "••/••/••••";
}

function SectionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={styles.sectionGroup}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <div style={styles.sectionGrid}>{children}</div>
    </section>
  );
}

function Field({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={highlight ? styles.fieldValueHighlight : styles.fieldValue}>{value}</div>
    </div>
  );
}

function CompactField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={styles.compactField}>
      <span style={styles.compactLabel}>{label}:</span>
      <span style={styles.compactValue}>{value}</span>
    </div>
  );
}

function Email({ value }: { value: string }) {
  return <a href={`mailto:${value}`} style={styles.link}>{value}</a>;
}

function Anchor({ href }: { href: string }) {
  const url = String(href).trim();
  const display = url.replace(/^https?:\/\//i, "");
  const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return <a href={safe} target="_blank" rel="noreferrer" style={styles.link}>{display}</a>;
}

// BF_PORTAL_BLOCK_v177_MULTI_LEG_BANNER_v1
function LegBanner({ kind, parentId }: { kind: "equipment" | "closing_costs"; parentId: string | null }) {
  const isEquipment = kind === "equipment";
  const label = isEquipment ? "Equipment leg" : "Closing-costs add-on";
  const subtitle = isEquipment ? "Linked to capital application" : "Linked to primary application";
  const bannerStyle = isEquipment ? styles.legBannerEquipment : styles.legBannerClosingCosts;
  return (
    <div style={bannerStyle}>
      <span style={styles.legBannerIcon} aria-hidden="true">↗</span>
      <span style={styles.legBannerLabel}>{label}</span>
      <span style={styles.legBannerSep}>·</span>
      <span style={styles.legBannerSubtitle}>{subtitle}</span>
      <span style={{ flex: 1 }} />
      {parentId && (
        <a href={`/applications/${parentId}/application`} style={styles.legBannerLink}>
          View primary →
        </a>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { color: "#0f172a", maxWidth: 1200 },
  loading: { padding: 40, textAlign: "center", color: "#64748b" },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  statusPill: {
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  sectionGroup: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    margin: "0 0 12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#475569",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: 8,
  },
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px 24px",
  },
  field: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  fieldValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fieldValueHighlight: { fontSize: 18, color: "#0f172a", fontWeight: 700 },
  link: { color: "#2563eb", textDecoration: "none" },
  ownerList: { display: "flex", flexDirection: "column", gap: 12, gridColumn: "1 / -1" },
  ownerCard: { background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0" },
  ownerHeader: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#0f172a" },
  ownerFields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "6px 16px",
  },
  compactField: { display: "flex", gap: 6, fontSize: 13, alignItems: "baseline" },
  compactLabel: { color: "#64748b", fontWeight: 600 },
  compactValue: { color: "#0f172a", fontWeight: 500 },
  empty: { color: "#94a3b8", fontSize: 14, fontStyle: "italic", gridColumn: "1 / -1" },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
  },
  callButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)",
  },
  callButtonDisabled: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#e2e8f0",
    color: "#94a3b8",
    border: 0,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "not-allowed",
    fontFamily: "inherit",
  },
  // BF_PORTAL_BLOCK_v177_MULTI_LEG_BANNER_v1
  legBannerEquipment: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#dbeafe",
    color: "#1e3a8a",
    border: "1px solid #93c5fd",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  legBannerClosingCosts: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef3c7",
    color: "#78350f",
    border: "1px solid #fcd34d",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  legBannerIcon: { fontWeight: 700, fontSize: 14 },
  legBannerLabel: { fontWeight: 700 },
  legBannerSep: { opacity: 0.5 },
  legBannerSubtitle: { fontWeight: 500 },
  legBannerLink: {
    color: "inherit",
    textDecoration: "underline",
    fontWeight: 600,
    fontSize: 13,
  },
};
