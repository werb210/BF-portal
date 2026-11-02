// BF_PORTAL_v872_KYC - the application's "ID verification" tab. Staff send a verification request to the applicant or
// a guarantor; the client completes it in the client app (vendor hosted ID + selfie, or manual uploads); results land
// here with plain-English reasons, the check results and the ID pictures (stored as documents on the file). Staff
// approve or decline anything the vendor sent to review, and every manual one. ID numbers are masked; only Admins can
// show the full number, and every reveal is logged.
import { Fragment, useCallback, useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { CHECK_LABEL, OPEN, STATUS_LOOK, kycApi, type IdDetails, type KycOverview, type KycStatus, type Verification } from "@/kyc/kycApi";
import { primaryButton, secondaryButton, useIsAdmin } from "@/dealTools/ui";

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const errText = (e: unknown, fallback: string) => {
  const anyE = e as { data?: { message?: string }; message?: string };
  return anyE?.data?.message || (e instanceof Error && e.message ? e.message : fallback);
};

export function KycChip({ status }: { status: KycStatus }) {
  const s = STATUS_LOOK[status] ?? STATUS_LOOK.error;
  return (
    <span data-testid={`kyc-chip-${status}`} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.fg, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Details({ v }: { v: Verification }) {
  const isAdmin = useIsAdmin();
  const [details, setDetails] = useState<IdDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const show = async (full: boolean) => {
    try { setDetails((await kycApi.idDetails(v.id, full)).details); setErr(null); }
    catch (e) { setErr(errText(e, "Could not load the ID details.")); }
  };
  if (!v.has_id_details) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {!details ? (
        <button type="button" style={{ ...secondaryButton, padding: "4px 10px", fontSize: 12 }} onClick={() => void show(false)}>Show what the ID says</button>
      ) : (
        <dl data-testid={`kyc-details-${v.id}`} style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "2px 12px", fontSize: 13, margin: "6px 0 0" }}>
          {([["Name", [details.first_name, details.last_name].filter(Boolean).join(" ")], ["Date of birth", details.date_of_birth], ["Document", details.document_type?.replace(/_/g, " ")],
            ["Number", details.document_number], ["Issued by", [details.issuing_state, details.issuing_country].filter(Boolean).join(", ")], ["Expires", details.date_of_expiry], ["Address", details.address]] as Array<[string, string | null | undefined]>)
            .filter(([, val]) => val)
            .map(([k, val]) => (<Fragment key={k}><dt style={{ color: "var(--ui-text-muted)" }}>{k}</dt><dd style={{ margin: 0, color: "var(--ui-text)" }}>{val}</dd></Fragment>))}
        </dl>
      )}
      {details && isAdmin && details.document_number?.includes("*") ? (
        <button type="button" style={{ ...secondaryButton, padding: "4px 10px", fontSize: 12, marginTop: 6 }} onClick={() => void show(true)}>Show the full number (logged)</button>
      ) : null}
      {err ? <p role="alert" style={{ ...muted, color: "#b91c1c" }}>{err}</p> : null}
    </div>
  );
}

function VerificationRow({ v, onChanged }: { v: Verification; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const canDecide = v.status === "review" || (v.provider === "manual" && OPEN.has(v.status));
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); try { toast.success(done); } catch { /* no toaster */ } onChanged(); }
    catch (e) { try { toast.error(errText(e, "That did not work.")); } catch { /* no toaster */ } }
    finally { setBusy(false); }
  };
  const checks = Object.entries(v.checks ?? {});
  return (
    <li data-testid={`kyc-row-${v.id}`} style={{ padding: "12px 0", borderTop: "1px solid var(--ui-border)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{v.person_name ?? "Applicant"}</strong>
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{v.person_role === "guarantor" ? "Guarantor" : "Applicant"}</span>
        <KycChip status={v.status} />
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          {v.provider === "onfido" ? "ID + selfie check" : "Manual review"} · sent {when(v.requested_at)}{v.completed_at ? ` · finished ${when(v.completed_at)}` : ""}
          {v.decision_source === "staff" ? " · decided by staff" : ""}
        </span>
      </div>
      {checks.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {checks.map(([k, r]) => (
            <span key={k} style={{ fontSize: 12, padding: "1px 8px", borderRadius: 999, border: "1px solid var(--ui-border)", color: "var(--ui-text)" }}>
              {CHECK_LABEL[k] ?? k.replace(/_/g, " ")}: <strong>{r === "clear" ? "passed" : r}</strong>
            </span>
          ))}
        </div>
      ) : null}
      {v.reasons.length ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
          {v.reasons.filter((r) => !r.code.endsWith("_clear")).map((r, i) => (
            <li key={`${r.code}-${i}`} style={{ color: "var(--ui-text)", fontWeight: r.severity === "red" ? 700 : 400 }}>
              {r.severity === "red" ? "Concern: " : r.severity === "amber" ? "Check: " : ""}{r.text}
            </li>
          ))}
        </ul>
      ) : null}
      {v.document_ids.length ? <p style={muted}>{v.document_ids.length} picture(s) saved to the Documents tab under "Identity verification".</p> : null}
      {v.review_note ? <p style={muted}>Staff note: {v.review_note}</p> : null}
      <Details v={v} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        {canDecide ? (
          <>
            <input aria-label="Review note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...input, minWidth: 200 }} />
            <button type="button" disabled={busy} style={primaryButton} onClick={() => void run(() => kycApi.decide(v.id, "approved", note), "Marked verified.")}>Approve</button>
            <button type="button" disabled={busy} style={secondaryButton} onClick={() => void run(() => kycApi.decide(v.id, "declined", note), "Marked declined.")}>Decline</button>
          </>
        ) : null}
        {v.provider === "onfido" && v.status !== "cancelled" && v.decision_source !== "staff" ? (
          <button type="button" disabled={busy} style={secondaryButton} onClick={() => void run(() => kycApi.refresh(v.id), "Updated from the verification service.")}>Check for results</button>
        ) : null}
        {OPEN.has(v.status) ? (
          <button type="button" disabled={busy} style={secondaryButton} onClick={() => void run(() => kycApi.cancel(v.id), "Request cancelled.")}>Cancel request</button>
        ) : null}
      </div>
    </li>
  );
}

export default function IdVerificationTab({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<KycOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [person, setPerson] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await kycApi.overview(applicationId); setData(r); setErr(null); }
    catch (e) { setErr(errText(e, "Could not load ID verification.")); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await kycApi.request(applicationId, person || null);
      try { toast.success(r.created ? "Verification request sent to the client." : "A request is already open for this person."); } catch { /* no toaster */ }
      await load();
    } catch (e) {
      setErr(errText(e, "Could not send the request."));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 20 }} data-testid="kyc-tab">
      <section style={card}>
        <h3 style={h3}>ID verification</h3>
        <p style={muted}>
          The client takes a photo of their government ID and a selfie in the client app. Results are a guide for a person to review, not a verdict.
          They also feed the Fraud check tab (ID checks).
        </p>
        {data ? (
          data.provider.configured ? (
            <p style={muted}>Using: {data.provider.label}.</p>
          ) : (
            <p role="alert" style={{ ...muted, color: "#92400e" }}>ID verification is not set up yet. An Admin can set it up in Settings &gt; ID verification.</p>
          )
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <label style={{ fontSize: 13, color: "var(--ui-text)" }}>
            Person{" "}
            <select aria-label="Person to verify" value={person} onChange={(e) => setPerson(e.target.value)} style={input}>
              <option value="">Applicant</option>
              {(data?.people ?? []).slice(1).map((p) => (
                <option key={p.contact_id} value={p.contact_id}>{p.name} ({p.role})</option>
              ))}
            </select>
          </label>
          <button type="button" style={primaryButton} disabled={busy || !data?.provider.configured} onClick={() => void send()}>Send verification request</button>
        </div>
        {err ? <p role="alert" style={{ ...muted, color: "#b91c1c" }}>{err}</p> : null}
      </section>
      <section style={card}>
        <h3 style={h3}>Requests and results</h3>
        {!data ? <p style={muted}>Loading…</p> : data.verifications.length === 0 ? <p style={muted}>No verification requests yet.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {data.verifications.map((v) => <VerificationRow key={v.id} v={v} onChanged={() => void load()} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
