// BF_PORTAL_v852_CALC_QBO - on the application card: the QuickBooks fee invoice for a media deal (number, amount,
// Open / Paid), and Retry when the last sync with QuickBooks failed. Shows nothing when there is no invoice or
// QuickBooks is not set up. Dark text on light fills: navy on blue (Open), green on green (Paid), red on red (failed).
import { useCallback, useEffect, useState } from "react";
import { quickbooksApi, invoiceMoney, type QboInvoice } from "./quickbooksApi";

export function invoiceLabel(inv: QboInvoice): string {
  const num = inv.docNumber ? "#" + inv.docNumber : inv.qboInvoiceId ? "id " + inv.qboInvoiceId : "";
  const status = inv.status === "paid" ? "Paid" : inv.status === "open" ? "Open" : "Not created yet";
  return ["QuickBooks invoice", num, invoiceMoney(inv.amount), status].filter(Boolean).join(" - ");
}

export default function QuickBooksInvoiceBadge({ applicationId }: { applicationId: string }) {
  const [inv, setInv] = useState<QboInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => {
    let alive = true;
    Promise.resolve()
      .then(() => quickbooksApi.invoice(applicationId))
      .then((r) => { if (alive) setInv(r?.invoice ?? null); })
      .catch(() => { if (alive) setInv(null); });
    return () => { alive = false; };
  }, [applicationId]);
  useEffect(() => load(), [load]);

  if (!inv) return null;
  const failed = inv.syncState === "failed";
  if (!inv.qboInvoiceId && !failed) return null;
  const paid = inv.status === "paid";
  const palette = failed
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : paid ? { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" } : { background: "#eff6ff", color: "#0B1F3A", border: "1px solid #bfdbfe" };

  const retry = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await quickbooksApi.retry(applicationId);
      if (r?.invoice) setInv(r.invoice);
      setMsg(r?.ok ? "Synced with QuickBooks." : "Still failing: " + (r?.error ?? "unknown error"));
    } catch (e) {
      setMsg("Retry failed: " + ((e as Error)?.message ?? "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span data-testid="qbo-invoice" role="status" title={failed && inv.lastError ? inv.lastError : undefined}
      style={{ ...palette, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 600, flexWrap: "wrap" }}>
      {inv.url ? <a href={inv.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{invoiceLabel(inv)}</a> : <span>{invoiceLabel(inv)}</span>}
      {failed && <span data-testid="qbo-invoice-error">Sync failed{inv.lastError ? ": " + inv.lastError.slice(0, 140) : ""}</span>}
      {failed && (
        <button type="button" data-testid="qbo-invoice-retry" disabled={busy} onClick={() => void retry()}
          style={{ background: "#ffffff", color: "#991b1b", border: "1px solid #991b1b", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {busy ? "Retrying..." : "Retry"}
        </button>
      )}
      {msg && <span data-testid="qbo-invoice-msg" style={{ fontWeight: 500 }}>{msg}</span>}
    </span>
  );
}
