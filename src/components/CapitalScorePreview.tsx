// BF_PORTAL_CAPITAL_SCORE_v784 - this POSTed a hard-coded sample to /scoring,
// which does not exist. POST /api/credit/score is real, and it also creates a
// CRM lead and texts the intake team, so it must only be sent for a real
// business that staff typed in.
// BF_PORTAL_CAPITAL_SCORE_FIELDS_v785 - the server reads annualRevenue and
// yearsInBusiness (years) and replies {score, message}; it has no credit score
// field, so sending revenue/months scored every business 60.
import { useState, type FormEvent } from "react";
import { api } from "@/api";

type ScoringResponse = {
  score?: number | null;
  message?: string | null;
};

const EMPTY = {
  companyName: "",
  fullName: "",
  email: "",
  phone: "",
  annualRevenue: "",
  yearsInBusiness: "",
};

const inputStyle = {
  padding: 8,
  borderRadius: 8,
  border: "1px solid var(--ui-border)",
  background: "var(--ui-surface-input)",
  color: "var(--ui-text)",
};

export default function CapitalScorePreview() {
  const [form, setForm] = useState(EMPTY);
  const [score, setScore] = useState<ScoringResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (field: keyof typeof EMPTY, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setScore(null);
    try {
      const data = await api.post<ScoringResponse>("/api/credit/score", {
        companyName: form.companyName.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        annualRevenue: Number(form.annualRevenue),
        yearsInBusiness: Number(form.yearsInBusiness),
      });
      setScore(data ?? {});
    } catch (err) {
      setError(err instanceof Error && err.message !== "API_ERROR" ? `Scoring failed: ${err.message}` : "Scoring failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "grid", gap: 8, maxWidth: 520, padding: 16, borderRadius: 12, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}
    >
      <p style={{ margin: 0, color: "var(--ui-text-muted)", fontSize: 13 }}>
        Scoring a business saves it as a new lead in the CRM and notifies the intake team. Only enter a real business.
      </p>
      <input aria-label="Business name" placeholder="Business name" required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} style={inputStyle} />
      <input aria-label="Contact name" placeholder="Contact name" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} style={inputStyle} />
      <input aria-label="Email" placeholder="Email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
      <input aria-label="Phone" placeholder="Phone" type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} style={inputStyle} />
      <input aria-label="Annual revenue" placeholder="Annual revenue ($)" type="number" min={0} required value={form.annualRevenue} onChange={(e) => update("annualRevenue", e.target.value)} style={inputStyle} />
      <input aria-label="Years in business" placeholder="Years in business" type="number" min={0} step="any" required value={form.yearsInBusiness} onChange={(e) => update("yearsInBusiness", e.target.value)} style={inputStyle} />
      <button type="submit" disabled={busy} style={{ padding: "8px 12px", borderRadius: 8, border: 0, background: "#1D4ED8", color: "#fff", justifySelf: "start" }}>
        {busy ? "Scoring..." : "Score and save lead"}
      </button>
      {error ? (
        <p role="alert" style={{ margin: 0, color: "#B91C1C", background: "#FEF2F2", padding: 8, borderRadius: 8 }}>{error}</p>
      ) : null}
      {score ? (
        <div>
          <p style={{ margin: 0 }}>Score: {score.score ?? "n/a"}</p>
          {score.message ? <p style={{ margin: 0 }}>{score.message}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
