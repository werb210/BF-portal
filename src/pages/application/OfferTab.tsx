// BF_PORTAL_v938_CARD_REDESIGN - Lenders > Offer. Every term sheet on the file (uploaded beside the lender on the Lenders
// sub-tab, or received by API), each with its terms, the term sheet PDF and "Send to client for signature". Below them the
// funding conditions: read from the lender's term sheet, approved by the broker (only approved conditions reach the
// client portal), tracked until cleared or waived; the file cannot move to Funded while any is open.
// The client portal shows two or more offers side by side (BF_CLIENT_OFFERS_IN_THREAD_v3).
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import FundingConditionsPanel from "@/brokerTools/FundingConditionsPanel";
import Gate from "@/brokerTools/gate";

export type FileOffer = {
  id: string; lender_name: string; amount: string | number | null; rate_factor: string | null; term: string | null;
  payment_frequency: string | null; expiry_date: string | null; document_url: string | null; status: string; created_at?: string;
};

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const btn: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const primary: CSSProperties = { ...btn, background: "#1e3a8a", borderColor: "#1e3a8a", color: "#fff" };

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Not sent yet", bg: "#f1f5f9", fg: "#334155" },
  pending_acceptance: { label: "Waiting for the client's signature", bg: "#fef3c7", fg: "#92400e" },
  accepted: { label: "Signed by the client", bg: "#dcfce7", fg: "#166534" },
  rejected: { label: "Declined", bg: "#fee2e2", fg: "#991b1b" },
  changes_requested: { label: "Client asked for changes", bg: "#dbeafe", fg: "#1e40af" },
};

export function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : "—";
}

export default function OfferTab({ applicationId, onOpenLenders }: { applicationId: string; onOpenLenders?: () => void }) {
  const [offers, setOffers] = useState<FileOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items?: FileOffer[] }>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`);
      setOffers(Array.isArray(res?.items) ? res.items : []);
      setError(null);
    } catch (e) { setError(getErrorMessage(e, "Could not load the offers on this file.")); setOffers([]); }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);

  async function send(o: FileOffer) {
    if (busy) return;
    setBusy(o.id); setMsgs((m) => { const n = { ...m }; delete n[o.id]; return n; });
    try {
      await api.post(`/api/offers/${encodeURIComponent(o.id)}/send-for-signature`, {});
      setMsgs((m) => ({ ...m, [o.id]: { ok: true, text: "Sent. The client has a text and can review and sign it in their app." } }));
      void load();
    } catch (e) {
      setMsgs((m) => ({ ...m, [o.id]: { ok: false, text: getErrorMessage(e, "The term sheet could not be sent for signature. Try again.") } }));
    } finally { setBusy(null); }
  }

  return (
    <div data-testid="offer-tab" style={{ maxWidth: 1200 }}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Term sheets on this file</h3>
          <span style={{ flex: 1 }} />
          {onOpenLenders ? <button type="button" style={btn} onClick={onOpenLenders}>Upload a lender's term sheet</button> : null}
        </div>
        <p style={muted}>Upload each lender's term sheet beside the lender on the Lenders tab. Two or more offers show side by side in the client portal.</p>
        {error ? <p role="alert" style={{ ...muted, color: "#b91c1c" }}>{error}</p> : null}
        {offers === null ? <p style={muted}>Loading…</p> : offers.length === 0 ? (
          <p data-testid="offer-none" style={{ ...muted, marginTop: 12 }}>No term sheet yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 12 }}>
            <thead><tr>{["Lender", "Amount", "Rate / factor", "Term", "Payments", "Expires", "Status", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "6px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {offers.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, bg: "#f1f5f9", fg: "#334155" };
                const m = msgs[o.id];
                const sent = o.status === "pending_acceptance" || o.status === "accepted";
                return (
                  <tr key={o.id} data-testid={`offer-row-${o.id}`} style={{ borderBottom: "1px solid var(--ui-border)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 700 }}>{o.lender_name}</td>
                    <td style={{ padding: "8px 6px" }}>{money(o.amount)}</td>
                    <td style={{ padding: "8px 6px" }}>{o.rate_factor || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.term || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.payment_frequency || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.expiry_date ? String(o.expiry_date).slice(0, 10) : "—"}</td>
                    <td style={{ padding: "8px 6px" }}><span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.fg }}>{st.label}</span></td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      {o.document_url ? <a href={o.document_url} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", display: "inline-block", marginRight: 6 }}>Term sheet</a> : null}
                      <button type="button" data-testid={`offer-send-${o.id}`} style={sent ? btn : primary} disabled={busy === o.id || o.status === "accepted"} aria-busy={busy === o.id} onClick={() => void send(o)}>
                        {busy === o.id ? "Sending…" : o.status === "accepted" ? "Signed" : sent ? "Send again" : "Send to client for signature"}
                      </button>
                      {m ? <div role={m.ok ? "status" : "alert"} style={{ fontSize: 12, marginTop: 4, color: m.ok ? "#166534" : "#b91c1c", whiteSpace: "normal" }}>{m.text}</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <Gate feature="funding_conditions"><FundingConditionsPanel applicationId={applicationId} /></Gate>
    </div>
  );
}
