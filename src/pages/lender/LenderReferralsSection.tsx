// BF_PORTAL_v828_PARTNER_PORTAL_THEME - UI-guide styling, a styled upload box and a stage tracker per file.
// BF_PORTAL_v827_REFERRAL_PIPELINE_CARD - the business name starts blank (it was filled from the zip's file name).
// BF_PORTAL_v825_LENDER_REFERRALS - lenders send Boreal the files they declined, one zip per client, several at a
// time, and follow each one. Boreal reviews every file first: the client hears nothing until Boreal accepts it.
// A complete package earns the lender 50% of Boreal's fee if it funds. The lender sees status only.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, rawApiFetch } from "@/api";
import FileDrop from "@/components/partner/FileDrop";
import StageTracker, { type TrackerInput } from "@/components/partner/StageTracker";

export type ReferredFile = {
  id: string;
  business_name: string;
  client_name: string | null;
  requested_amount: string | number | null;
  zip_name: string;
  sent_at: string;
  progress: string;
  /** BF_PORTAL_v828_PARTNER_STAGE_TRACKER - the referral status and the application's stage, for the tracker. */
  status?: string | null;
  stage?: string | null;
  share: string;
  payout_amount: string | number | null;
  payout_paid_on: string | null;
};

export type ReferralRow = {
  key: string;
  file: File;
  businessName: string;
  clientName: string;
  clientPhone: string;
  amount: string;
  reason: string;
};

type UploadResult = { file: string; ok: boolean; message?: string };

export const MAX_FILES = 10;
export const MAX_BYTES = 50 * 1024 * 1024;

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` };
}

export function phoneDigits(value: string): string {
  const d = value.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

/** What still needs filling in before the files can be sent; empty when ready. */
export function rowProblems(rows: ReferralRow[], consent: boolean): string[] {
  const problems: string[] = [];
  if (rows.length === 0) problems.push("Choose at least one zip.");
  if (rows.length > MAX_FILES) problems.push(`Send up to ${MAX_FILES} zips at a time.`);
  rows.forEach((r, i) => {
    const label = `File ${i + 1} (${r.file.name})`;
    if (!/[.]zip$/i.test(r.file.name)) problems.push(`${label}: upload a .zip file.`);
    if (r.file.size > MAX_BYTES) problems.push(`${label}: each zip must be 50 MB or smaller.`);
    if (!r.businessName.trim()) problems.push(`${label}: enter the business name.`);
    if (phoneDigits(r.clientPhone).length !== 10) problems.push(`${label}: enter the client's 10-digit cell number.`);
  });
  if (rows.length > 0 && !consent) problems.push("Confirm each client agreed to be referred to Boreal Financial.");
  return problems;
}

export function detailsFor(rows: ReferralRow[]) {
  return rows.map((r) => ({
    business_name: r.businessName.trim(),
    client_name: r.clientName.trim() || null,
    client_phone: r.clientPhone.trim(),
    requested_amount: r.amount.trim() || null,
    decline_reason: r.reason.trim() || null,
    consent: true,
  }));
}

/** BF_PORTAL_v828_PARTNER_STAGE_TRACKER - where a referred file sits on the stage tracker. */
export function referralTracker(f: Pick<ReferredFile, "status" | "stage">): TrackerInput {
  if (f.status === "pending" || f.status === "accepting") return { hold: "under_review" };
  if (f.status === "declined") return { hold: "not_accepted" };
  return { stage: f.stage ?? null, hold: "waiting_client" };
}

const money = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : "$" + Number(v).toLocaleString("en-CA", { maximumFractionDigits: 2 }));

const title: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ui-text)" };
const muted: React.CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", lineHeight: 1.5 };
const input: React.CSSProperties = {
  padding: "0 12px", minHeight: 40, border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14, minWidth: 0,
  background: "var(--ui-surface-input)", color: "var(--ui-text)",
};

export default function LenderReferralsSection() {
  const [files, setFiles] = useState<ReferredFile[] | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showProblems, setShowProblems] = useState(false);
  const picker = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ files?: ReferredFile[] }>("/api/lender-referrals/mine", { headers: authHeader() });
      setFiles(Array.isArray(r?.files) ? r.files : []);
    } catch {
      setFiles((cur) => cur ?? []);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const choose = (list: File[] | FileList | null) => {
    if (!list) return;
    const added = Array.from(list).map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`, file, businessName: "", clientName: "", clientPhone: "", amount: "", reason: "",
    }));
    setRows((cur) => [...cur, ...added].slice(0, MAX_FILES));
    setResults([]);
    setMsg(null);
    if (picker.current) picker.current.value = "";
  };

  const update = (key: string, patch: Partial<ReferralRow>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => setRows((cur) => cur.filter((r) => r.key !== key));

  const problems = rowProblems(rows, consent);

  const send = async () => {
    setShowProblems(true);
    if (problems.length > 0) return;
    const fd = new FormData();
    rows.forEach((r) => fd.append("files", r.file, r.file.name));
    fd.append("details", JSON.stringify(detailsFor(rows)));
    setBusy(true);
    setMsg(null);
    setResults([]);
    try {
      const res = await rawApiFetch("/api/lender-referrals/mine", { method: "POST", body: fd, headers: authHeader() });
      const j = (await res.json().catch(() => ({}))) as { sent?: number; results?: UploadResult[]; message?: string };
      const list = Array.isArray(j.results) ? j.results : [];
      setResults(list.filter((r) => !r.ok));
      const sent = Number(j.sent ?? 0);
      if (sent > 0) {
        setMsg(`Sent ${sent} file${sent === 1 ? "" : "s"}. Boreal will review ${sent === 1 ? "it" : "them"} before contacting the client.`);
        const failed = new Set(list.filter((r) => !r.ok).map((r) => r.file));
        setRows((cur) => cur.filter((r) => failed.has(r.file.name)));
        if (failed.size === 0) setConsent(false);
        setShowProblems(false);
        void load();
      } else {
        setMsg(j.message ?? (list.length ? "None of the files could be sent. See below." : `Upload failed (${res.status}).`));
      }
    } catch {
      setMsg("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pp-card" data-testid="lender-referrals">
      {/* BF_PORTAL_v835_LENDER_TABS - was "Send us files you declined" */}
      <h2 style={{ ...title, marginBottom: 10 }}>Applications you cannot place</h2>
      <p style={{ ...muted, margin: "0 0 6px" }}>
        Send us a deal you could not do and we will look for another lender. One zip per client with their application and
        documents. You can send up to {MAX_FILES} at a time.
      </p>
      <p style={{ ...muted, margin: "0 0 14px" }}>
        We review each file first. The client hears nothing from us until we accept the file. If the file is a complete
        package and it funds, you receive 50% of Boreal's fee.
      </p>

      <FileDrop inputRef={picker} label="Choose client zip files" title="Tap to choose client zips, or drop them here"
        hint={`One .zip per client, up to ${MAX_FILES} at a time, 50 MB each`} accept=".zip" multiple disabled={busy}
        onFiles={(list) => choose(list)} />

      {rows.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r, i) => (
            <div key={r.key} data-testid="referral-row" className="pp-card pp-card--inset">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: "var(--ui-text)", overflowWrap: "anywhere" }}>{i + 1}. {r.file.name}</strong>
                <button type="button" className="pp-btn pp-btn--small" onClick={() => remove(r.key)} aria-label={`Remove ${r.file.name}`}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                <input style={input} aria-label={`Business name for ${r.file.name}`} placeholder="Business name *" value={r.businessName} onChange={(e) => update(r.key, { businessName: e.target.value })} />
                <input style={input} aria-label={`Client name for ${r.file.name}`} placeholder="Client name" value={r.clientName} onChange={(e) => update(r.key, { clientName: e.target.value })} />
                <input style={input} aria-label={`Client cell for ${r.file.name}`} placeholder="Client cell *" inputMode="tel" value={r.clientPhone} onChange={(e) => update(r.key, { clientPhone: e.target.value })} />
                <input style={input} aria-label={`Amount requested for ${r.file.name}`} placeholder="Amount requested" inputMode="decimal" value={r.amount} onChange={(e) => update(r.key, { amount: e.target.value })} />
              </div>
              <input style={{ ...input, width: "100%", marginTop: 8, boxSizing: "border-box" }} aria-label={`Why you declined ${r.file.name}`} placeholder="Why you declined it (optional)" value={r.reason} onChange={(e) => update(r.key, { reason: e.target.value })} />
            </div>
          ))}
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: "var(--ui-text)" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I confirm each client above agreed to be referred to Boreal Financial.</span>
          </label>
          {showProblems && problems.length > 0 && (
            <ul role="alert" className="pp-error" style={{ margin: 0, paddingLeft: 18 }}>
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          <div>
            <button type="button" className="pp-btn pp-btn--primary" disabled={busy} onClick={() => void send()}>
              {busy ? "Sending..." : `Send ${rows.length} file${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {msg && <p role="status" style={{ fontSize: 14, color: "var(--ui-text)", marginTop: 12 }}>{msg}</p>}
      {results.length > 0 && (
        <ul className="pp-error" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {results.map((r) => <li key={r.file}>{r.file}: {r.message ?? "Could not be sent."}</li>)}
        </ul>
      )}

      <h3 style={{ ...title, fontSize: 16, margin: "22px 0 8px" }}>Your referred files</h3>
      <p style={{ ...muted, margin: "0 0 10px" }}>Follow each file from when we receive it to when it funds.</p>
      {files === null ? (
        <p style={muted}>Loading...</p>
      ) : files.length === 0 ? (
        <p style={muted}>No files sent yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {files.map((f) => (
            <article key={f.id} className="pp-card pp-card--inset" data-testid="referred-file">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="pp-subtitle" style={{ overflowWrap: "anywhere" }}>{f.business_name}</div>
                  <div className="pp-muted">{f.client_name ? `${f.client_name} · ` : ""}sent {new Date(f.sent_at).toLocaleDateString("en-CA")}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13 }}>
                  <div><span className="pp-muted">Your share: </span>{f.share}</div>
                  {f.payout_amount !== null && f.payout_amount !== undefined
                    ? <div><span className="pp-muted">Payout: </span>{money(f.payout_amount)}{f.payout_paid_on ? ` paid ${f.payout_paid_on}` : ""}</div>
                    : null}
                </div>
              </div>
              <StageTracker {...referralTracker(f)} label={`Stage for ${f.business_name}`} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
