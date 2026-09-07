import { useState } from "react";
import { api } from "@/api";

// BF_PORTAL_CONTACT_AI_SUMMARY_v1 - one-click AI summary of a contact's or company's recent activity.
export function ContactAiSummary({ contactId, companyId }: { contactId?: string; companyId?: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const path = companyId
    ? `/api/crm/companies/${companyId}/ai-summary`
    : `/api/crm/contacts/${contactId}/ai-summary`;
  async function run() {
    setLoading(true);
    setErr(null);
    setSummary(null);
    try {
      const data = await api.get<{ summary?: string }>(path);
      setSummary(data?.summary ?? "No summary returned.");
    } catch {
      setErr("Could not generate a summary right now.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong>AI summary</strong>
        <button type="button" onClick={run} disabled={loading}>
          {loading ? "Summarizing…" : "Summarize"}
        </button>
      </div>
      {err ? <div style={{ marginTop: 8, color: "var(--ui-danger, #b91c1c)" }}>{err}</div> : null}
      {summary ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{summary}</div> : null}
    </section>
  );
}

export default ContactAiSummary;
