// BF_PORTAL_v855_RETENTION - Settings -> Retention & legal holds (Admins): the legal holds (place / release), and the
// report of records past their 7 years that may now be deleted. Nothing is deleted automatically.
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { LockIcon } from "@/retention/RetentionLock";
import {
  fetchReport, formatDay, listHolds, placeHold, releaseHold, type HoldRow, type RetentionReport,
} from "@/retention/retention";

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const h3: CSSProperties = { margin: "0 0 10px", fontSize: 16, color: "var(--ui-text)" };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13 };
const cell: CSSProperties = { padding: "7px 10px", borderTop: "1px solid var(--ui-border)", fontSize: 13, color: "var(--ui-text)", textAlign: "left", verticalAlign: "top" };
const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: "100%", boxSizing: "border-box" };
const button: CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const quiet: CSSProperties = { padding: "5px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const errorBox: CSSProperties = { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };
const okBox: CSSProperties = { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#dcfce7", color: "#14532d", fontSize: 13 };

const TYPE_LABEL: Record<string, string> = { application: "Application", contact: "Contact", company: "Company" };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function HoldsCard() {
  const [holds, setHolds] = useState<HoldRow[] | null>(null);
  const [showReleased, setShowReleased] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [type, setType] = useState<"application" | "contact" | "company">("application");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setHolds(await listHolds(showReleased));
    } catch (e) {
      setErr(errText(e, "Could not load the legal holds."));
      setHolds([]);
    }
  }, [showReleased]);
  useEffect(() => { void load(); }, [load]);

  const onPlace = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!targetId.trim()) return setErr("Enter the id of the application, contact or company (shown in its address bar).");
    if (reason.trim().length < 3) return setErr("Give a reason for the hold.");
    setBusy(true);
    try {
      const h = await placeHold(type, targetId.trim(), reason.trim());
      setOk(`Legal hold placed on ${h.target_label ?? h.target_id}. Nothing under it can be deleted until it is released.`);
      setTargetId(""); setReason("");
      await load();
    } catch (e2) {
      setErr(errText(e2, "Could not place the hold."));
    } finally {
      setBusy(false);
    }
  };

  const onRelease = async (h: HoldRow) => {
    const why = typeof window !== "undefined" ? window.prompt(`Release the legal hold on ${h.target_label ?? h.target_id}?\n\nReason for releasing (recorded in the audit log):`) : "";
    if (why === null) return;
    setErr(null); setOk(null);
    try {
      await releaseHold(h.id, why ?? "");
      setOk("Hold released. The normal 7-year retention still applies.");
      await load();
    } catch (e) {
      setErr(errText(e, "Could not release the hold."));
    }
  };

  return (
    <section style={card} aria-labelledby="holds-h">
      <h3 id="holds-h" style={h3}>Legal holds</h3>
      <p style={muted}>
        A hold stops anything on an application, contact or company (and everything under it) from being deleted or purged,
        whatever its date, until an admin releases it. Placing and releasing a hold is recorded in the audit log.
      </p>
      <form onSubmit={(e) => void onPlace(e)} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 160px) 1fr", gap: 8, alignItems: "center", marginTop: 12 }}>
        <label htmlFor="hold-type" style={{ fontSize: 13 }}>Hold on</label>
        <select id="hold-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} style={input}>
          <option value="application">Application</option>
          <option value="contact">Contact</option>
          <option value="company">Company</option>
        </select>
        <label htmlFor="hold-id" style={{ fontSize: 13 }}>Record id</label>
        <input id="hold-id" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="The id from the record's address" style={input} autoComplete="off" />
        <label htmlFor="hold-reason" style={{ fontSize: 13 }}>Reason</label>
        <input id="hold-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: litigation, regulator request" style={input} maxLength={1000} />
        <span />
        <div><button type="submit" style={button} disabled={busy}>{busy ? "Placing..." : "Place legal hold"}</button></div>
      </form>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      {ok && <div role="status" style={okBox}>{ok}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <strong style={{ fontSize: 14 }}>{showReleased ? "All holds" : "Active holds"}</strong>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={showReleased} onChange={(e) => setShowReleased(e.target.checked)} /> Show released holds
        </label>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
          <thead>
            <tr>
              <th style={cell}>Record</th><th style={cell}>Reason</th><th style={cell}>Placed</th><th style={cell}>Status</th><th style={cell} />
            </tr>
          </thead>
          <tbody>
            {holds === null && <tr><td style={cell} colSpan={5}>Loading...</td></tr>}
            {holds?.length === 0 && <tr><td style={cell} colSpan={5}>No {showReleased ? "" : "active "}legal holds.</td></tr>}
            {holds?.map((h) => (
              <tr key={h.id} data-testid="hold-row">
                <td style={cell}>{TYPE_LABEL[h.target_type] ?? h.target_type}: {h.target_label ?? h.target_id}</td>
                <td style={cell}>{h.reason}</td>
                <td style={cell}>{when(h.placed_at)}{h.placed_by_name ? ` by ${h.placed_by_name}` : ""}</td>
                <td style={cell}>
                  {h.released_at
                    ? `Released ${when(h.released_at)}${h.released_by_name ? ` by ${h.released_by_name}` : ""}${h.release_reason ? ` (${h.release_reason})` : ""}`
                    : <span style={{ display: "inline-flex", gap: 4, alignItems: "center", color: "#78350f", background: "#fef3c7", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}><LockIcon /> Active</span>}
                </td>
                <td style={cell}>{!h.released_at && <button type="button" style={quiet} onClick={() => void onRelease(h)}>Release</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportCard() {
  const [report, setReport] = useState<RetentionReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setErr(null);
    try { setReport(await fetchReport()); } catch (e) { setErr(errText(e, "Could not load the retention report.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const t = report?.totals;
  return (
    <section style={card} aria-labelledby="report-h">
      <h3 id="report-h" style={h3}>Eligible for deletion</h3>
      <p style={muted}>
        Applications, documents, signed agreements, lender packages and audit events are kept for 7 years from the later of
        the upload and the file closing (funded, declined or withdrawn). After that they are listed here. Nothing is deleted
        automatically: an admin decides, using the Delete buttons on the record.
      </p>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      {t && (
        <ul style={{ margin: "10px 0", paddingLeft: 18, fontSize: 13 }} data-testid="retention-totals">
          <li>{t.records.toLocaleString()} files on record</li>
          <li>{t.open_files.toLocaleString()} still open (kept until 7 years after they close)</li>
          <li>{t.locked_until_date.toLocaleString()} closed and inside their 7 years</li>
          <li>{t.held.toLocaleString()} under a legal hold</li>
          <li>{t.eligible.toLocaleString()} eligible for deletion</li>
        </ul>
      )}
      {report && (
        <>
          <strong style={{ fontSize: 14 }}>Applications</strong>
          {report.eligible_applications.length === 0
            ? <p style={muted}>None yet.</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
                <thead><tr><th style={cell}>Application</th><th style={cell}>Closed</th><th style={cell}>Eligible since</th></tr></thead>
                <tbody>
                  {report.eligible_applications.map((a) => (
                    <tr key={a.application_id} data-testid="eligible-application">
                      <td style={cell}><a href={`/applications/${a.application_id}`} style={{ color: "inherit", textDecoration: "underline" }}>{a.label}</a></td>
                      <td style={cell}>{when(a.closed_at)}</td>
                      <td style={cell}>{formatDay(a.eligible_since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <strong style={{ display: "block", fontSize: 14, marginTop: 12 }}>Documents on files that are otherwise still kept</strong>
          {report.eligible_documents.length === 0
            ? <p style={muted}>None yet.</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
                <thead><tr><th style={cell}>Document</th><th style={cell}>Application</th><th style={cell}>Eligible since</th></tr></thead>
                <tbody>
                  {report.eligible_documents.map((d) => (
                    <tr key={d.document_id} data-testid="eligible-document">
                      <td style={cell}>{d.label ?? d.document_id}</td>
                      <td style={cell}>{d.application_label ?? d.application_id}</td>
                      <td style={cell}>{formatDay(d.eligible_since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <p style={{ ...muted, marginTop: 12 }}>
            Audit events older than 7 years: {report.eligible_audit_events.count.toLocaleString()}
            {report.eligible_audit_events.oldest ? ` (oldest ${when(report.eligible_audit_events.oldest)})` : ""}.
          </p>
        </>
      )}
      <button type="button" style={quiet} onClick={() => void load()}>Refresh</button>
    </section>
  );
}

export default function RetentionSettings() {
  return (
    <div data-testid="retention-settings">
      <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Retention &amp; legal holds</h2>
      <p style={{ ...muted, marginBottom: 16 }}>
        Lending records are kept for 7 years after the file closes, and cannot be deleted before then. Delete buttons show a
        lock and the first date the record can be deleted.
      </p>
      <HoldsCard />
      <ReportCard />
    </div>
  );
}
