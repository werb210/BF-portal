// BF_PORTAL_v827_REFERRAL_PIPELINE_CARD - on an application that came from a lender referral: who sent it and why
// they declined it, and (until decided) Accept / Decline. Accepting asks whether it is a complete package (the lender
// gets 50% of Boreal's fee if it funds) and texts the client to sign in. Declining takes it off the pipeline; the
// client is never contacted.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { decisionText, formatPhone, money, referralAction, type StaffReferral } from "./lenderReferralShared";

import { originBox, originButton, originKicker, originPrimary } from "./originStyles";

// BF_PORTAL_v828_APPLICATION_ORIGIN - shown inside "Where this came from"; the origin panel passes the referral it
// already loaded (initial), so it is not fetched twice.
export default function LenderReferralPanel({ applicationId, initial }: { applicationId: string; initial?: StaffReferral | null }) {
  const navigate = useNavigate();
  const [r, setR] = useState<StaffReferral | null>(initial ?? null);
  const [accepting, setAccepting] = useState(false);
  const [complete, setComplete] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ referral?: StaffReferral | null }>(`/api/lender-referrals/by-application/${encodeURIComponent(applicationId)}`);
      setR(res?.referral ?? null);
    } catch {
      setR(null);
    }
  }, [applicationId]);
  useEffect(() => { if (applicationId && initial === undefined) void load(); }, [applicationId, initial, load]);

  if (!r) return null;
  const pending = r.status === "pending";

  const accept = async () => {
    if (complete === null) { setMsg("Choose whether this is a complete package."); return; }
    setBusy(true); setMsg(null);
    try {
      const j = await referralAction(r.id, "accept", { complete_package: complete, ...(note.trim() ? { note: note.trim() } : {}) });
      setMsg(j?.texted ? "Accepted. The client was texted to sign in." : "Accepted. The text to the client did not go out - text them from the application.");
      setAccepting(false);
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    const why = window.prompt(`Decline ${r.business_name}? It comes off the pipeline and the client is never contacted. Reason (optional):`, "");
    if (why === null) return;
    setBusy(true); setMsg(null);
    try {
      await referralAction(r.id, "decline", why.trim() ? { note: why.trim() } : {});
      navigate("/pipeline");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That did not work.");
      setBusy(false);
    }
  };

  return (
    <div style={originBox(pending)} data-testid="lender-referral-panel">
      <div style={originKicker}>Where this came from</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>Lender referral from {r.lender_name ?? "a lender"}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        {r.client_name ? `${r.client_name} · ` : ""}{formatPhone(r.client_phone)} · {money(r.requested_amount)} · sent {new Date(r.created_at).toLocaleDateString("en-CA")}
      </div>
      {r.decline_reason && <div style={{ fontSize: 13, marginTop: 4 }}>Why the lender declined: {r.decline_reason}</div>}
      <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>{decisionText(r)}{r.decision_note ? ` - ${r.decision_note}` : ""}</div>
      {pending && !accepting && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" style={originPrimary} disabled={busy} onClick={() => { setAccepting(true); setComplete(null); setMsg(null); }}>Accept</button>
          <button type="button" style={originButton} disabled={busy} onClick={() => void decline()}>Decline</button>
        </div>
      )}
      {pending && accepting && (
        <div style={{ marginTop: 10 }} data-testid="accept-panel">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Is this a complete package?</div>
          <label style={{ display: "block", fontSize: 14 }}>
            <input type="radio" name="complete-package" checked={complete === true} onChange={() => setComplete(true)} /> Yes - the lender gets 50% of Boreal's fee if it funds
          </label>
          <label style={{ display: "block", fontSize: 14 }}>
            <input type="radio" name="complete-package" checked={complete === false} onChange={() => setComplete(false)} /> No - no lender share
          </label>
          <input aria-label="Note (optional)" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            style={{ marginTop: 8, padding: "0 12px", minHeight: 40, border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14, width: "100%", boxSizing: "border-box", background: "var(--ui-surface-input)", color: "var(--ui-text)" }} />
          <div style={{ fontSize: 13, margin: "8px 0" }}>Accepting texts the client to sign in. The text does not name the lender.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={originPrimary} disabled={busy} onClick={() => void accept()}>{busy ? "Accepting..." : "Accept and text the client"}</button>
            <button type="button" style={originButton} disabled={busy} onClick={() => setAccepting(false)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <div role="status" style={{ fontSize: 13, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
