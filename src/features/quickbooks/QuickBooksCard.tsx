// BF_PORTAL_v852_CALC_QBO - Settings -> QuickBooks (Admins). Connect the company's QuickBooks Online file (Intuit
// sign-in), see which company is connected and by whom, set the tax code for the fee line, Disconnect (revokes access
// at Intuit). When the server has no QuickBooks settings the card is greyed out with the reason. Signed client-side
// media fee agreements then become QuickBooks invoices, marked paid when the deal funds.
import { useEffect, useState, type CSSProperties } from "react";
import { quickbooksApi, type QboStatus } from "./quickbooksApi";

const NAVY = "#0B1F3A";
const MUTED = "#475569";
const card: CSSProperties = { background: "#ffffff", color: NAVY, border: "1px solid #cbd5e1", borderRadius: 12, padding: 20, maxWidth: 720, display: "grid", gap: 12 };
const btn: CSSProperties = { background: NAVY, color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btn2: CSSProperties = { ...btn, background: "#ffffff", color: NAVY, border: "1px solid " + NAVY };
const disabledBtn: CSSProperties = { ...btn, background: "#e2e8f0", color: "#334155", cursor: "not-allowed" };

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "");

export function returnNotice(search: string): { ok: boolean; text: string } | null {
  const v = new URLSearchParams(search).get("quickbooks");
  if (v === "connected") return { ok: true, text: "QuickBooks is connected." };
  if (v === "error") return { ok: false, text: "QuickBooks was not connected. Try Connect again; if it keeps failing, check the Intuit app's redirect URI." };
  return null;
}

export default function QuickBooksCard({ navigateTo = (url: string) => { window.location.assign(url); } }: { navigateTo?: (url: string) => void }) {
  const [status, setStatus] = useState<QboStatus | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(() => (typeof window !== "undefined" ? returnNotice(window.location.search) : null));
  const [tax, setTax] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => quickbooksApi.status())
      .then((s) => { if (!live) return; setStatus(s); setTax(s?.taxCode ?? ""); })
      .catch((e) => { if (live) setFailed((e as Error)?.message || "Could not load QuickBooks."); });
    return () => { live = false; };
  }, [reload]);

  if (failed) return <div style={card}><strong>QuickBooks</strong><p role="alert" style={{ margin: 0, color: "#991b1b", fontWeight: 600 }}>{failed}</p></div>;
  if (!status) return <div style={card}><strong>QuickBooks</strong><p role="status" style={{ margin: 0, color: MUTED }}>Loading...</p></div>;

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await quickbooksApi.connect();
      if (r?.url) navigateTo(r.url);
      else setMsg({ ok: false, text: "The server did not return the Intuit sign-in link." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Could not start the connection." });
    } finally { setBusy(false); }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect QuickBooks? Fee invoices stop syncing until it is connected again.")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await quickbooksApi.disconnect();
      setMsg({ ok: true, text: r?.revoked ? "Disconnected; access was revoked at Intuit." : "Disconnected. Intuit did not confirm the revoke; remove the app in QuickBooks if it is still listed." });
      setReload((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Could not disconnect." });
    } finally { setBusy(false); }
  };
  const saveTax = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await quickbooksApi.saveTaxCode(tax.trim() || null);
      setMsg({ ok: true, text: r?.taxCode ? "Tax code saved: " + r.taxCode + "." : "Tax code cleared." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Could not save the tax code." });
    } finally { setBusy(false); }
  };

  const conn = status.connection;
  return (
    <div data-testid="quickbooks-card" style={{ ...card, ...(status.configured ? {} : { background: "#f8fafc" }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 17 }}>QuickBooks</strong>
        <span data-testid="quickbooks-state" style={{ fontSize: 13, fontWeight: 700, borderRadius: 999, padding: "2px 10px", ...(status.connected ? { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" } : { background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }) }}>
          {!status.configured ? "Not set up" : status.connected ? "Connected" : "Not connected"}{status.configured ? " (" + (status.environment === "production" ? "production" : "sandbox") + ")" : ""}
        </span>
      </div>
      <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>
        When a client signs the media fee agreement (2% on funding), Boreal creates the QuickBooks invoice. When the deal funds, the invoice is set to the funded amount and marked paid.
      </p>

      {!status.configured && (
        <p data-testid="quickbooks-reason" style={{ margin: 0, color: "#334155", fontSize: 14, background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" }}>
          {status.reason || "QuickBooks is not set up on the server."} Ask whoever manages the server settings to add {status.missing.join(", ")}.
        </p>
      )}

      {status.configured && status.connected && conn && (
        <div style={{ fontSize: 14 }}>
          <div><span style={{ color: MUTED }}>Company:</span> <strong>{conn.companyName || "Company " + conn.realmId}</strong></div>
          <div><span style={{ color: MUTED }}>Connected:</span> {day(conn.connectedAt)}{conn.connectedByName ? " by " + conn.connectedByName : ""}</div>
          {conn.refreshExpiresAt && <div><span style={{ color: MUTED }}>Reconnect before:</span> {day(conn.refreshExpiresAt)} (renewed automatically while invoices sync)</div>}
          {status.invoices && <div><span style={{ color: MUTED }}>Fee invoices:</span> {status.invoices.open} open, {status.invoices.paid} paid{status.invoices.failed ? ", " : ""}{status.invoices.failed ? <strong style={{ color: "#991b1b" }}>{status.invoices.failed} failed to sync</strong> : null}</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!status.connected && (
          <button type="button" data-testid="quickbooks-connect" disabled={!status.configured || busy} title={status.configured ? undefined : "QuickBooks is not set up on the server"}
            onClick={() => void connect()} style={status.configured ? btn : disabledBtn}>
            {busy ? "Opening Intuit..." : "Connect to QuickBooks"}
          </button>
        )}
        {status.connected && (
          <button type="button" data-testid="quickbooks-disconnect" disabled={busy} onClick={() => void disconnect()} style={btn2}>Disconnect</button>
        )}
      </div>

      {status.configured && (
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600, maxWidth: 360 }}>
          Tax code for the fee line (optional)
          <span style={{ display: "flex", gap: 8 }}>
            <input data-testid="quickbooks-tax" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="QuickBooks tax code id, e.g. 5"
              style={{ flex: 1, padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, color: NAVY, background: "#ffffff" }} />
            <button type="button" data-testid="quickbooks-tax-save" disabled={busy} onClick={() => void saveTax()} style={btn2}>Save</button>
          </span>
          <span style={{ fontWeight: 400, color: MUTED }}>Needed when the QuickBooks company charges sales tax (GST/HST); leave empty otherwise.</span>
        </label>
      )}

      {msg && <div role="status" data-testid="quickbooks-msg" style={{ fontSize: 14, fontWeight: 600, color: msg.ok ? "#065f46" : "#991b1b" }}>{msg.text}</div>}
    </div>
  );
}
