import { useState } from "react";
import { api } from "@/api";
import { ANNUAL_REVENUE, AR_BALANCE, COLLATERAL, MONTHLY_REVENUE, YEARS_IN_BUSINESS } from "@/constants/creditEnums";

// BF_PORTAL_CREDIT_READINESS_SUBMIT_v784 - this navigated to /credit-results,
// which has no route in the portal (blank screen). Submit the answers to the
// server and show the result, with the client's application link, here.
// BF_PORTAL_CREDIT_READINESS_FIELDS_v785 - field names match BF-Server v785,
// which replies {success, leadId, redirect, readinessScore, readinessTier}.
type ReadinessResult = {
  score: number | string | null;
  tier: string | null;
  link: string | null;
};

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readReadinessResult(res: any): ReadinessResult {
  const r = res?.result ?? res ?? {};
  const score = r.readinessScore ?? r.score ?? r.readiness_score ?? null;
  return {
    score: typeof score === "number" || typeof score === "string" ? score : null,
    tier: firstString(r.readinessTier, r.tier, r.readiness_tier, r.rating),
    link: firstString(
      r.redirect,
      r.applicationUrl,
      r.application_url,
      r.continuationUrl,
      r.continuation_url,
      r.continueUrl,
      r.redirectUrl,
      r.redirect_url,
      r.link,
      r.url,
    ),
  };
}

export default function CreditReadiness() {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    phone: "",
    email: "",
    industry: "",
    salesHistoryYears: "",
    annualRevenueRange: "",
    avgMonthlyRevenueRange: "",
    accountsReceivableRange: "",
    fixedAssetsValueRange: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await api.post("/api/website/credit-readiness", form);
      setResult(readReadinessResult(res));
    } catch (err) {
      setError(err instanceof Error && err.message !== "API_ERROR" ? `Could not submit: ${err.message}` : "Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Select it and copy it manually.");
    }
  };

  return (
    <div className="container">
      <h1>Credit Readiness</h1>
      <form onSubmit={handleSubmit} autoComplete="on">

        <input
          name="companyName"
          placeholder="Company Name"
          autoComplete="organization"
          required
          value={form.companyName}
          onChange={(e) => update("companyName", e.target.value)}
        />

        <input
          name="fullName"
          placeholder="Full Name"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />

        <input
          name="phone"
          placeholder="Phone"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />

        <input
          name="email"
          placeholder="Email"
          autoComplete="email"
          required
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />

        <input
          name="industry"
          placeholder="Industry"
          required
          value={form.industry}
          onChange={(e) => update("industry", e.target.value)}
        />

        <select
          required
          value={form.salesHistoryYears}
          onChange={(e) => update("salesHistoryYears", e.target.value)}
        >
          <option value="">Years in business</option>
          {YEARS_IN_BUSINESS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <select
          required
          value={form.annualRevenueRange}
          onChange={(e) => update("annualRevenueRange", e.target.value)}
        >
          <option value="">Annual revenue</option>
          {ANNUAL_REVENUE.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <select
          required
          value={form.avgMonthlyRevenueRange}
          onChange={(e) => update("avgMonthlyRevenueRange", e.target.value)}
        >
          <option value="">Average monthly revenue</option>
          {MONTHLY_REVENUE.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <select
          required
          value={form.accountsReceivableRange}
          onChange={(e) => update("accountsReceivableRange", e.target.value)}
        >
          <option value="">Account Receivables</option>
          {AR_BALANCE.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <select
          required
          value={form.fixedAssetsValueRange}
          onChange={(e) => update("fixedAssetsValueRange", e.target.value)}
        >
          <option value="">Available collateral</option>
          {COLLATERAL.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <button type="submit" disabled={submitting}>{submitting ? "Checking..." : "Check Credit Readiness"}</button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "#B91C1C", background: "#FEF2F2", padding: 8, borderRadius: 8 }}>{error}</p>
      ) : null}

      {result ? (
        <section aria-label="Credit readiness result" style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>
          <h2 style={{ marginTop: 0 }}>Result</h2>
          {result.score !== null && result.score !== "" ? <p style={{ margin: "4px 0" }}>Score: {result.score}</p> : null}
          {result.tier ? <p style={{ margin: "4px 0" }}>Readiness: {result.tier}</p> : null}
          {result.link ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <span>Client application link:</span>
              <a href={result.link} target="_blank" rel="noreferrer" style={{ color: "var(--ui-text)", textDecoration: "underline", wordBreak: "break-all" }}>
                {result.link}
              </a>
              <button type="button" onClick={() => void copyLink()}>{copied ? "Copied" : "Copy"}</button>
            </div>
          ) : (
            <p style={{ margin: "4px 0", color: "var(--ui-text-muted)" }}>No application link was returned.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
