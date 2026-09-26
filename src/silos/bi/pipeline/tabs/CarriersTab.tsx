// BF_PORTAL_BLOCK_v560_BI_SEND_TO_CARRIER
// One row per coverage the applicant selected. Staff pick which carrier to send it
// to (BI-Server v559 catalogue) and send: by email when the carrier has a
// submission address on file, otherwise the carrier's portal opens and the send is
// recorded. Carrier product names are unverified until each carrier confirms them.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

type Carrier = {
  id: string; carrier: string; product_name: string; notes: string; instant_bind: boolean;
  submission_email: string | null; submission_url: string | null; verified: boolean;
};
export type CoverageRow = {
  application_product_id: string; code: string; display_name: string; country: string;
  stage: string; chosen_carrier: string | null; last_sent_at: string | null; carriers: Carrier[];
};
type SendResult = { ok: boolean; method?: "email" | "portal"; sentTo?: string | null };

export function carrierLabel(c: Carrier): string {
  const tags = [c.instant_bind ? "instant bind" : "", c.verified ? "" : "name unverified",
    c.submission_email ? "email" : c.submission_url ? "portal" : "no contact on file"].filter(Boolean);
  return `${c.carrier} - ${c.product_name}${tags.length ? ` (${tags.join(", ")})` : ""}`;
}

export default function CarriersTab({ applicationId, readOnly }: { applicationId: string; readOnly?: boolean }) {
  const [rows, setRows] = useState<CoverageRow[] | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await api<{ products: CoverageRow[] }>(`/api/v1/bi/applications/${applicationId}/carrier-options`);
      const list = Array.isArray(r?.products) ? r.products : [];
      setRows(list);
      setChoice((prev) => {
        const next = { ...prev };
        for (const row of list) if (!next[row.application_product_id] && row.carriers[0]) next[row.application_product_id] = row.carriers[0].id;
        return next;
      });
    } catch {
      setRows([]);
    }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  const send = async (row: CoverageRow) => {
    const carrierProductId = choice[row.application_product_id];
    const carrier = row.carriers.find((c) => c.id === carrierProductId);
    if (!carrier) return;
    setBusy(row.application_product_id);
    setMsg((m) => ({ ...m, [row.application_product_id]: "" }));
    try {
      const r = await api<SendResult>(`/api/v1/bi/applications/${applicationId}/products/${row.application_product_id}/send-to-carrier`, {
        method: "POST",
        body: JSON.stringify({ carrierProductId, note: note[row.application_product_id] ?? "" }),
      });
      if (r?.method === "portal" && r.sentTo) window.open(r.sentTo, "_blank", "noopener");
      setMsg((m) => ({ ...m, [row.application_product_id]: r?.method === "email" ? `Emailed to ${carrier.carrier} (${r.sentTo}).` : `${carrier.carrier} portal opened - recorded as sent.` }));
      await load();
    } catch (e) {
      const text = e instanceof Error && /no_submission_contact/.test(e.message)
        ? `No submission email or portal on file for ${carrier.carrier} yet.`
        : "Send failed. Please try again.";
      setMsg((m) => ({ ...m, [row.application_product_id]: text }));
    } finally {
      setBusy(null);
    }
  };

  if (rows === null) return <p>Loading...</p>;
  if (!rows.length) return <p>The applicant has not selected any coverages yet.</p>;

  return (
    <div data-testid="bi-carriers-tab">
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
        Carrier product names come from carrier materials and are unverified until each carrier confirms them.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><th align="left">Coverage</th><th align="left">Carrier</th><th align="left">Note</th><th /><th align="left">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.application_product_id} style={{ borderTop: "1px solid var(--ui-border)" }}>
              <td style={{ padding: 8 }}>{row.display_name} <span style={{ color: "var(--ui-text-muted)" }}>({row.country})</span></td>
              <td style={{ padding: 8 }}>
                {row.carriers.length ? (
                  <select aria-label={`Carrier for ${row.display_name}`} value={choice[row.application_product_id] ?? ""}
                    onChange={(e) => setChoice((c) => ({ ...c, [row.application_product_id]: e.target.value }))} disabled={readOnly}>
                    {row.carriers.map((c) => <option key={c.id} value={c.id}>{carrierLabel(c)}</option>)}
                  </select>
                ) : <em>No carrier writes this here</em>}
              </td>
              <td style={{ padding: 8 }}>
                <input aria-label={`Note for ${row.display_name}`} value={note[row.application_product_id] ?? ""} disabled={readOnly}
                  onChange={(e) => setNote((n) => ({ ...n, [row.application_product_id]: e.target.value }))} placeholder="Optional" />
              </td>
              <td style={{ padding: 8 }}>
                <button type="button" disabled={readOnly || !row.carriers.length || busy === row.application_product_id} onClick={() => void send(row)}>
                  {busy === row.application_product_id ? "Sending..." : "Send to carrier"}
                </button>
              </td>
              <td style={{ padding: 8, fontSize: 13 }}>
                {msg[row.application_product_id] || (row.last_sent_at
                  ? `Sent to ${row.chosen_carrier ?? "carrier"} ${new Date(row.last_sent_at).toLocaleDateString()}`
                  : row.stage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
