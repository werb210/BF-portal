// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
import type { CSSProperties } from "react";

export default function ApplicationTab({ application }: { application: Record<string, any> | null }) {
  if (!application) return <div style={styles.page}>Loading…</div>;

  const business = application.businessDetails ?? application.business ?? {};
  const applicant = application.applicantDetails ?? application.applicantInfo ?? application.applicant ?? {};
  const fp = application.financialProfile ?? application.kyc ?? {};
  const owner = (Array.isArray(application.owners) && application.owners[0]) || applicant || {};

  const productLabel = application.overview?.productCategory ?? application.overview?.productType ?? application.productCategory ?? "—";
  const requestedAmount = application.overview?.requestedAmount ?? application.fundingRequest?.amount;
  const purpose = fp.purposeOfFunds ?? fp.purpose ?? application.fundingRequest?.purpose ?? "—";
  const stage = application.stage ?? application.status ?? "—";
  const ownerName = `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.name || "—";
  const applicantName = `${applicant.firstName ?? ""} ${applicant.lastName ?? ""}`.trim() || applicant.name || "—";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.companyName}>{fmt(business.name ?? business.legalName ?? application.applicant ?? "Unknown business")}</h2>
        <span style={styles.submittedAt}>Submitted {fmtDate(application.submittedAt ?? application.submitted_at)}</span>
      </div>

      <div style={styles.fundCard}>
        <div style={styles.fundLine}>
          <span style={styles.fundIcon}>$</span>
          <span>{fmtMoney(requestedAmount)}</span>
          <span style={{ color: "#475569", fontWeight: 500 }}>{fmt(productLabel)}</span>
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>· {fmt(stage)}</span>
        </div>
        <div style={styles.fundNote}>Credit Summary not yet generated</div>
      </div>

      <div style={styles.sectionTitle}>Business Details</div>
      <div style={styles.twoCol}>
        <div style={styles.fieldList}>
          <span style={styles.fieldLabel}>Legal Business Name:</span><span style={styles.fieldValue}>{fmt(business.legalName ?? business.name)}</span>
          <span style={styles.fieldLabel}>Business Address:</span><span style={styles.fieldValue}>{fmt(business.address ?? business.streetAddress)}</span>
          <span style={styles.fieldLabel}>Business Phone Number:</span><span style={styles.fieldValue}>{fmt(business.phone ?? business.phoneNumber)}</span>
          <span style={styles.fieldLabel}>Time in Business:</span><span style={styles.fieldValue}>{fmt(business.timeInBusiness ?? business.yearsInBusiness)}</span>
          <span style={styles.fieldLabel}>Industry:</span><span style={styles.fieldValue}>{fmt(business.industry)}</span>
          <span style={styles.fieldLabel}>Entity Type:</span><span style={styles.fieldValue}>{fmt(business.entityType ?? business.businessType)}</span>
        </div>
        <div style={styles.fieldList}>
          <span style={styles.fieldLabel}>Monthly Revenue:</span><span style={styles.fieldValue}>{fmtMoney(business.monthlyRevenue ?? fp.monthlyRevenue)}</span>
          <span style={styles.fieldLabel}>Number of Employees:</span><span style={styles.fieldValue}>{fmt(business.numberOfEmployees ?? business.employees)}</span>
          <span style={styles.fieldLabel}>Website:</span>
          <span style={styles.fieldValue}>{business.website ? <a href={String(business.website)} target="_blank" rel="noreferrer" style={styles.link}>{String(business.website)}</a> : "—"}</span>
        </div>
      </div>

      <div style={styles.twoCol}>
        <div><div style={styles.sectionTitle}>Use of Funds</div><div style={styles.fieldList}><span style={styles.fieldLabel}>Loan Amount Requested:</span><span style={styles.fieldValue}>{fmtMoney(requestedAmount)}</span><span style={styles.fieldLabel}>Purpose of Loan:</span><span style={styles.fieldValue}>{fmt(purpose)}</span></div></div>
        <div><div style={styles.sectionTitle}>Ownership Information</div><div style={styles.fieldList}><span style={styles.fieldLabel}>Owner Name:</span><span style={styles.fieldValue}>{ownerName}</span><span style={styles.fieldLabel}>Title:</span><span style={styles.fieldValue}>{fmt(owner.title)}</span><span style={styles.fieldLabel}>Ownership Percentage:</span><span style={styles.fieldValue}>{fmt(owner.ownershipPercent ?? owner.ownership)}{owner.ownershipPercent || owner.ownership ? "%" : ""}</span><span style={styles.fieldLabel}>Credit Score:</span><span style={styles.fieldValue}>{fmt(owner.creditScore ?? fp.creditScore)}</span></div></div>
      </div>

      <div style={styles.sectionTitle}>Applicant Contact Info</div>
      <div style={styles.fieldList}>
        <span style={styles.fieldLabel}>Name:</span><span style={styles.fieldValue}>{applicantName}</span>
        <span style={styles.fieldLabel}>Phone Number:</span><span style={styles.fieldValue}>{fmt(applicant.phone ?? applicant.phoneNumber)}</span>
        <span style={styles.fieldLabel}>Email:</span><span style={styles.fieldValue}>{applicant.email ? <a href={`mailto:${applicant.email}`} style={styles.link}>{applicant.email}</a> : "—"}</span>
      </div>
      <div style={styles.footer}>This information was submitted by the applicant and cannot be edited.</div>
    </div>
  );
}

function fmt(v: unknown, fallback = "—"): string { return v === null || v === undefined || v === "" ? fallback : String(v); }
function fmtMoney(v: unknown, fallback = "—"): string { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : NaN; return !Number.isFinite(n) || n <= 0 ? fallback : `$${Math.round(n).toLocaleString()}`; }
function fmtDate(v: unknown, fallback = "—"): string { if (typeof v !== "string" || !v) return fallback; const d = new Date(v); return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }); }

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, color: "#0f172a" }, header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 },
  companyName: { fontSize: 24, fontWeight: 700, margin: 0 }, submittedAt: { fontSize: 13, color: "#64748b" },
  fundCard: { background: "#f1f5f9", borderRadius: 10, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 },
  fundLine: { display: "flex", gap: 12, alignItems: "center", fontSize: 16, fontWeight: 600 }, fundIcon: { width: 28, height: 28, borderRadius: 6, background: "#dbeafe", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#1e40af", fontWeight: 700 },
  fundNote: { fontSize: 13, color: "#64748b", marginTop: 4 }, sectionTitle: { fontSize: 16, fontWeight: 700, margin: "20px 0 12px", borderBottom: "1px solid #e5e7eb", paddingBottom: 6 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }, fieldList: { display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 8, columnGap: 16, fontSize: 14 },
  fieldLabel: { color: "#64748b" }, fieldValue: { color: "#0f172a", fontWeight: 500 }, link: { color: "#2563eb", textDecoration: "none" }, footer: { marginTop: 24, padding: "12px 0", borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#94a3b8", textAlign: "center" }
};
