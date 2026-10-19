// BF_PORTAL_v827_REFERRAL_PIPELINE_CARD - above the Sales Pipeline: lender files that are still being read, or that
// could not be read, so they have no card yet. Download the zip, try again, or decline (the client is never contacted).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { downloadReferralZip, referralAction, type StaffReferral } from "./lenderReferralShared";

const btn: React.CSSProperties = { padding: "4px 10px", borderRadius: 6, fontSize: 12, border: "1px solid #9a3412", background: "#fff", color: "#431407", cursor: "pointer" };

/** Still being read (just sent) - no buttons yet. A file sent more than 10 minutes ago without a card is stuck. */
export function stillReading(r: Pick<StaffReferral, "import_error" | "created_at">, now = Date.now()): boolean {
  return !r.import_error && now - new Date(r.created_at).getTime() < 10 * 60 * 1000;
}

export function withoutCard(rows: StaffReferral[]): StaffReferral[] {
  return rows.filter((r) => r.status === "pending" && !r.application_id);
}

export default function LenderReferralIssues() {
  const [rows, setRows] = useState<StaffReferral[]>([]);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ referrals?: StaffReferral[] }>("/api/lender-referrals");
      setRows(withoutCard(Array.isArray(r?.referrals) ? r.referrals : []));
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (rows.length === 0) return null;
  const run = async (r: StaffReferral, what: () => Promise<unknown>, done: string) => {
    setBusy(r.id);
    setMsg((m) => ({ ...m, [r.id]: "" }));
    try { await what(); setMsg((m) => ({ ...m, [r.id]: done })); void load(); }
    catch (e) { setMsg((m) => ({ ...m, [r.id]: e instanceof Error ? e.message : "That did not work." })); }
    finally { setBusy(null); }
  };

  return (
    <div data-testid="lender-referral-issues" style={{ border: "1px solid #fdba74", background: "#fff7ed", color: "#431407", borderRadius: 10, padding: 12, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Lender files without a card yet ({rows.length})</div>
      {rows.map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid #fed7aa" }}>
          <div style={{ fontSize: 13, minWidth: 0 }}>
            <strong>{r.business_name}</strong> from {r.lender_name ?? "a lender"} - {r.import_error ? `could not be read: ${r.import_error}` : stillReading(r) ? "reading the files..." : "not imported yet"}
            {msg[r.id] && <div role="status">{msg[r.id]}</div>}
          </div>
          {!stillReading(r) && (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={btn} disabled={busy === r.id || !r.has_zip} onClick={() => void run(r, () => downloadReferralZip(r), "")}>Download zip</button>
              <button type="button" style={btn} disabled={busy === r.id} onClick={() => void run(r, () => referralAction(r.id, "retry-import"), "Imported - it is now a card in Received.")}>Try again</button>
              <button type="button" style={btn} disabled={busy === r.id}
                onClick={() => { const why = window.prompt(`Decline ${r.business_name}? The client is never contacted. Reason (optional):`, ""); if (why !== null) void run(r, () => referralAction(r.id, "decline", why.trim() ? { note: why.trim() } : {}), "Declined."); }}>Decline</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
