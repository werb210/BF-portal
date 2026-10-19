// BF_PORTAL_v825_LENDER_REFERRALS - Marketing > Referrers > Lender referrals: files lenders declined and sent to
// Boreal. Staff download the zip, check it, then Accept (the file is imported like a broker file and the client is
// texted to sign in) or Decline (the zip is deleted; the client is never contacted). Accepting asks whether the
// file is a complete package: a complete package earns the lender 50% of Boreal's fee if it funds.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rawApiFetch } from "@/api";

export type StaffReferral = {
  id: string;
  lender_name: string | null;
  business_name: string;
  client_name: string | null;
  client_phone: string;
  requested_amount: string | number | null;
  decline_reason: string | null;
  zip_name: string;
  zip_size: number | null;
  file_names: string[] | null;
  status: "pending" | "accepting" | "accepted" | "declined";
  complete_package: boolean | null;
  decision_note: string | null;
  decided_at: string | null;
  application_id: string | null;
  client_texted_at: string | null;
  created_at: string;
  progress: string;
  has_zip: boolean;
};

export function formatPhone(e164: string | null | undefined): string {
  const d = String(e164 ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(e164 ?? "");
}

export function decisionText(r: Pick<StaffReferral, "status" | "complete_package" | "client_texted_at">): string {
  if (r.status === "pending") return "Waiting for review";
  if (r.status === "accepting") return "Importing...";
  if (r.status === "declined") return "Declined - the client was not contacted";
  const share = r.complete_package ? "complete package, lender gets 50% of Boreal's fee" : "incomplete package, no lender share";
  return `Accepted (${share})${r.client_texted_at ? " - client texted" : " - client not texted yet"}`;
}

const money = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : "$" + Number(v).toLocaleString("en-CA", { maximumFractionDigits: 0 }));
const card = { background: "var(--surface, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: 16, marginBottom: 12 } as const;
const muted = { fontSize: 13, color: "var(--text-muted, #475569)" } as const;
const btn = { padding: "6px 12px", borderRadius: 6, fontSize: 13, border: "1px solid var(--border, #cbd5e1)", background: "transparent", color: "inherit", cursor: "pointer" } as const;
const primary = { ...btn, background: "#0B1F3A", color: "#fff", border: "1px solid #0B1F3A" } as const;

export default function LenderReferralsPage() {
  const [rows, setRows] = useState<StaffReferral[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [accepting, setAccepting] = useState<string | null>(null);
  const [complete, setComplete] = useState<boolean | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ referrals?: StaffReferral[] }>("/api/lender-referrals");
      setRows(Array.isArray(r?.referrals) ? r.referrals : []);
    } catch {
      setRows((cur) => cur ?? []);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const say = (id: string, text: string) => setMsg((m) => ({ ...m, [id]: text }));

  const download = async (r: StaffReferral) => {
    setBusy(r.id);
    say(r.id, "");
    try {
      const res = await rawApiFetch(`/api/lender-referrals/${encodeURIComponent(r.id)}/zip`);
      if (!res.ok) { say(r.id, "The zip could not be downloaded."); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = r.zip_name || "file.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      say(r.id, "The zip could not be downloaded. Check your connection.");
    } finally {
      setBusy(null);
    }
  };

  const post = async (id: string, path: "accept" | "decline", body: Record<string, unknown>) => {
    setBusy(id);
    say(id, "");
    try {
      const res = await rawApiFetch(`/api/lender-referrals/${encodeURIComponent(id)}/${path}`, { method: "POST", body: JSON.stringify(body) });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok) { say(id, j?.message ?? j?.error ?? "That did not work."); return false; }
      if (path === "accept") say(id, j?.texted ? "Accepted. The client was texted to sign in." : "Accepted. The text to the client did not go out - text them from the application.");
      else say(id, "Declined. The zip was deleted.");
      void load();
      return true;
    } catch {
      say(id, "That did not work. Check your connection.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const confirmAccept = async (r: StaffReferral) => {
    if (complete === null) { say(r.id, "Choose whether this is a complete package."); return; }
    if (await post(r.id, "accept", { complete_package: complete, note: note.trim() || undefined })) {
      setAccepting(null); setComplete(null); setNote("");
    }
  };

  const decline = async (r: StaffReferral) => {
    const why = window.prompt(`Decline ${r.business_name}? The zip is deleted and the client is never contacted. Reason (optional):`, "");
    if (why === null) return;
    await post(r.id, "decline", { note: why.trim() || undefined });
  };

  const pending = (rows ?? []).filter((r) => r.status === "pending" || r.status === "accepting");
  const done = (rows ?? []).filter((r) => r.status === "accepted" || r.status === "declined");

  const renderRow = (r: StaffReferral) => (
    <div key={r.id} style={card} data-testid={`lender-referral-${r.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{r.business_name}</div>
          <div style={muted}>
            From {r.lender_name ?? "a lender"} on {new Date(r.created_at).toLocaleDateString("en-CA")} · {r.client_name ? `${r.client_name} · ` : ""}{formatPhone(r.client_phone)} · {money(r.requested_amount)}
          </div>
          {r.decline_reason && <div style={{ ...muted, marginTop: 4 }}>Why the lender declined: {r.decline_reason}</div>}
          <div style={{ ...muted, marginTop: 4 }}>{r.zip_name}{Array.isArray(r.file_names) && r.file_names.length ? ` (${r.file_names.length} files: ${r.file_names.slice(0, 8).join(", ")}${r.file_names.length > 8 ? ", ..." : ""})` : ""}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>{decisionText(r)}{r.decision_note ? ` - ${r.decision_note}` : ""}</div>
          {r.application_id && <div style={{ fontSize: 13, marginTop: 4 }}><Link to={`/applications/${r.application_id}`}>Open the application</Link> · {r.progress}</div>}
        </div>
        {r.status === "pending" && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            <button type="button" style={btn} disabled={busy === r.id || !r.has_zip} onClick={() => void download(r)}>Download zip</button>
            <button type="button" style={primary} disabled={busy === r.id} onClick={() => { setAccepting(r.id); setComplete(null); setNote(""); }}>Accept</button>
            <button type="button" style={btn} disabled={busy === r.id} onClick={() => void decline(r)}>Decline</button>
          </div>
        )}
      </div>
      {accepting === r.id && r.status === "pending" && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #e5e7eb)" }} data-testid="accept-panel">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Is this a complete package?</div>
          <label style={{ display: "block", fontSize: 14 }}>
            <input type="radio" name={`complete-${r.id}`} checked={complete === true} onChange={() => setComplete(true)} /> Yes - the lender gets 50% of Boreal's fee if it funds
          </label>
          <label style={{ display: "block", fontSize: 14 }}>
            <input type="radio" name={`complete-${r.id}`} checked={complete === false} onChange={() => setComplete(false)} /> No - no lender share
          </label>
          <input aria-label="Note (optional)" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            style={{ marginTop: 8, padding: "7px 9px", border: "1px solid var(--border, #d1d5db)", borderRadius: 6, fontSize: 14, width: "100%", boxSizing: "border-box" }} />
          <p style={{ ...muted, margin: "8px 0" }}>Accepting imports the file and texts the client to sign in. The text does not name the lender.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={primary} disabled={busy === r.id} onClick={() => void confirmAccept(r)}>{busy === r.id ? "Importing..." : "Accept and text the client"}</button>
            <button type="button" style={btn} onClick={() => setAccepting(null)}>Cancel</button>
          </div>
        </div>
      )}
      {msg[r.id] && <div role="status" style={{ fontSize: 13, marginTop: 8 }}>{msg[r.id]}</div>}
    </div>
  );

  return (
    <div>
      <p style={{ ...muted, marginBottom: 12 }}>
        Files lenders declined and sent to us. The client is not contacted until you accept the file.
      </p>
      {rows === null ? <p style={muted}>Loading...</p> : (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>To review ({pending.length})</h3>
          {pending.length === 0 ? <p style={muted}>Nothing waiting.</p> : pending.map(renderRow)}
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "18px 0 8px" }}>Decided</h3>
          {done.length === 0 ? <p style={muted}>None yet.</p> : done.map(renderRow)}
        </>
      )}
    </div>
  );
}
