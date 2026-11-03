// BF_PORTAL_v867_BROKER_TOOLS_CREDIT_BUREAU - Deal desk > Credit bureau: ask the applicant (or a guarantor) for consent, which they
// give in the client app; then pull Equifax Canada or TransUnion Canada. Each report's key fields show here, the PDF
// is filed on the application, and the score feeds the scorecard and the credit summary.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { downloadFile, useRun } from "./useRun";

type Provider = { bureau: string; name: string; ready: boolean; test_mode: boolean; setup: string[] };
type Consent = { id: string; status: "requested" | "given" | "revoked"; subject: { first_name: string; last_name: string }; method: string | null; given_at: string | null; attest_note: string | null };
type Pull = { id: string; consent_id: string; bureau: string; status: string; score: number | null; first_name: string; last_name: string; pulled_at: string; error: string | null;
  key_fields: { delinquencies?: { d30: number; d60: number; d90: number }; collections?: number; bankruptcies?: number; judgments?: number; inquiries_6m?: number; trades?: { count: number; total_balance: number } } };

/** "2 x 30, 1 x 60, 0 x 90+" style summary of the late payments. */
export function latesText(k: Pull["key_fields"]): string {
  const d = k.delinquencies ?? { d30: 0, d60: 0, d90: 0 };
  return `${d.d30} x 30, ${d.d60} x 60, ${d.d90} x 90+`;
}

export default function CreditBureauPanel({ applicationId, isAdmin = false }: { applicationId: string; isAdmin?: boolean }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}/credit-bureau`;
  const [data, setData] = useState<{ consents: Consent[]; pulls: Pull[]; providers: Provider[]; applicant: Record<string, string | null> } | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const load = useCallback(async () => {
    const r = await api.get<any>(base).catch(() => null);
    if (!r) return setData({ consents: [], pulls: [], providers: [], applicant: {} });
    setData(r);
    setForm((f) => (f.first_name || f.last_name ? f : { first_name: r.applicant?.first_name ?? "", last_name: r.applicant?.last_name ?? "", email: r.applicant?.email ?? "" }));
  }, [base]);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  if (!data) return <section style={card}><h3 style={h3}>Credit bureau</h3><p style={muted}>Loading...</p></section>;
  const testMode = data.providers.some((p) => p.test_mode);

  return (
    <section style={card} data-testid="credit-bureau-panel">
      <h3 style={h3}>Credit bureau</h3>
      <p style={muted}>A pull needs the person's consent, given in the client app (or, for an Admin, recorded from a signed form) in the last 90 days.</p>
      {testMode && <p style={{ ...muted, color: "var(--ui-text)" }}><Chip tone="amber">Test mode</Chip> Reports are test data until the bureau connection is set up.</p>}
      {data.providers.filter((p) => !p.ready).map((p) => <p key={p.bureau} style={muted}>{p.name} is not set up yet.</p>)}
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {data.consents.map((c) => (
        <div key={c.id} data-testid={`consent-${c.id}`} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{c.subject.first_name} {c.subject.last_name}</strong>
            <Chip tone={c.status === "given" ? "green" : c.status === "requested" ? "amber" : "grey"}>{c.status === "given" ? `Consent given${c.method === "staff_attested" ? " (signed form)" : ""}` : c.status === "requested" ? "Waiting for consent in the client app" : "Withdrawn"}</Chip>
          </div>
          <div style={{ ...row, marginTop: 6 }}>
            {c.status === "given" && data.providers.filter((p) => p.ready).map((p) => (
              <button key={p.bureau} type="button" style={primaryButton} disabled={busy} onClick={() => { if (window.confirm(`Pull ${p.name} for ${c.subject.first_name} ${c.subject.last_name}?${p.test_mode ? " (test data)" : " This is billed."}`)) void run(() => api.post(`${base}/pulls`, { consent_id: c.id, bureau: p.bureau }), "Report pulled."); }}>Pull {p.name}</button>
            ))}
            {c.status === "requested" && isAdmin && <button type="button" style={secondaryButton} disabled={busy} onClick={() => { const note = window.prompt("Where is the signed consent form kept?"); if (note) void run(() => api.post(`${base}/consents/${c.id}/attest`, { note }), "Consent recorded."); }}>Consent on a signed form</button>}
            {c.status !== "revoked" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Mark this consent withdrawn?")) void run(() => api.post(`${base}/consents/${c.id}/revoke`, {})); }}>Withdrawn</button>}
          </div>
        </div>
      ))}
      <div style={{ ...row, marginTop: 12 }}>
        <label style={label}>First name<input style={input} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
        <label style={label}>Last name<input style={input} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
        <label style={{ ...label, flex: "1 1 320px" }}>Email<input type="email" style={{ ...input, width: "100%", minWidth: 280 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.post(`${base}/consents`, form), "Consent requested. The client sees it in the client app.")}>Ask for consent</button>
      </div>
      {data.pulls.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={table} data-testid="credit-pulls">
            <thead><tr>{["Person", "Bureau", "Score", "Lates", "Collections", "Bankruptcies", "Inquiries (6 mo)", "Pulled", ""].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
            <tbody>{data.pulls.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.first_name} {p.last_name}</td><td style={td}>{p.bureau === "equifax_ca" ? "Equifax" : "TransUnion"}</td>
                <td style={td}><strong>{p.status === "no_hit" ? "No file" : p.status === "failed" ? "Failed" : p.score ?? "-"}</strong></td>
                <td style={td}>{latesText(p.key_fields)}</td><td style={td}>{p.key_fields.collections ?? 0}</td><td style={td}>{p.key_fields.bankruptcies ?? 0}</td><td style={td}>{p.key_fields.inquiries_6m ?? 0}</td>
                <td style={td}>{new Date(p.pulled_at).toLocaleDateString("en-CA")}</td>
                <td style={td}>{p.status !== "failed" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => downloadFile(`${base}/pulls/${p.id}/report`, "credit report.pdf"))}>Report</button>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
