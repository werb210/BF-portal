// BF_PORTAL_v856_CRM_UNIFY - the AI summary card for contacts and companies in every CRM. It sits at the top of the
// record (above Stage history on a contact's Analytics tab, above the timeline on a company). The last summary is
// kept on the server, so it shows straight away with when it was made and the sources it used - the company's own
// website (read safely on the server; free email providers are skipped), what the business does, and the CRM records.
//   CrmKsLicenseeCard - Keystone contacts are brokerages and licensees, not borrowers: their card shows the Keystone
//   plan, seats, status, demo progress and payment status instead of Credit Readiness.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { crmUnified, errorText, type CrmBackend, type CrmEntity, type KsLicensee, type SummaryPayload } from "./crmUnifiedApi";
import { plainBtn } from "./CrmTags";

export function CrmAiSummary({ backend, entity, id }: { backend: CrmBackend; entity: CrmEntity; id: string }) {
  const unified = useMemo(() => crmUnified(backend), [backend]);
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [taskMsg, setTaskMsg] = useState<string | null>(null);
  // BF_PORTAL_v907_MORE_SOURCES
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreMsg, setMoreMsg] = useState<string | null>(null);
  const [found, setFound] = useState<Array<{ label: string; url: string; detail: string | null }>>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  async function findMore() {
    setMoreBusy(true); setMoreMsg(null);
    try {
      const r = await unified.moreSources(entity, id);
      if (r?.summary && typeof r.summary === "object" && "summary" in r.summary) setData(r.summary);
      setFound(Array.isArray(r?.sources) ? r.sources : []);
      setPhoto(r?.photoUrl ?? null);
      setMoreMsg(r?.sources?.length ? `Found ${r.sources.length} public page(s).` : "No more public pages were found.");
    } catch (e) {
      setMoreMsg(errorText(e, "The web search did not answer. Try again in a minute."));
    } finally { setMoreBusy(false); }
  }
  useEffect(() => {
    let alive = true;
    setData(null);
    unified.summary(entity, id).then((r) => { if (alive && r && typeof r === "object" && "summary" in r) setData(r); }).catch(() => undefined);
    return () => { alive = false; };
  }, [unified, entity, id]);
  async function run() {
    setLoading(true); setErr(null); setTaskMsg(null);
    try {
      const r = await unified.generateSummary(entity, id);
      setData(r && typeof r === "object" && "summary" in r ? r : null);
    } catch (e) {
      setErr(errorText(e, "Could not generate a summary right now."));
    } finally {
      setLoading(false);
    }
  }
  async function createTask() {
    setTaskMsg(null);
    try {
      await api.post("/api/tasks", {
        title: "Follow up", type: "TODO", priority: "MEDIUM", body: data?.summary ?? null,
        due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        contact_id: entity === "contact" ? id : null, company_id: entity === "company" ? id : null,
      });
      setTaskMsg("Follow-up task created (due in 2 days).");
    } catch {
      setTaskMsg("Could not create the task.");
    }
  }
  return (
    <section style={card} data-testid="crm-ai-summary">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong>AI summary</strong>
        <button type="button" onClick={() => void run()} disabled={loading} style={plainBtn}>
          {loading ? "Summarizing..." : data ? "Refresh" : "Summarize"}
        </button>
      </div>
      {err && <div role="alert" style={{ marginTop: 8, color: "#b91c1c" }}>{err}</div>}
      {data && (
        <>
          {data.business && (
            <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--ui-surface-muted)", borderRadius: 6 }}>
              <div style={label}>What the business does</div>
              <div>{data.business}</div>
            </div>
          )}
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{data.summary}</div>
          <div style={{ marginTop: 10 }}>
            <div style={label}>Sources</div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ui-text)" }}>
              {data.sources.map((s, i) => (
                <li key={`${s.type}-${i}`}>
                  {s.url && s.status === "used"
                    ? <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>{s.label}</a>
                    : <span>{s.label}</span>}
                  {s.detail ? <span style={{ color: "var(--ui-text-muted)" }}> - {s.detail}</span> : null}
                  {s.status === "unavailable" ? <span style={{ color: "var(--ui-text-muted)" }}> (could not be read)</span> : null}
                  {s.status === "skipped" ? <span style={{ color: "var(--ui-text-muted)" }}> (skipped)</span> : null}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 4 }}>
              {data.cached ? "Saved summary from " : "Made "}{new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>
          {/* BF_PORTAL_v907_MORE_SOURCES - public pages only (a public LinkedIn profile, the company's team or about page); nothing behind a login. */}
          {backend.kind === "bf" && (
            <div style={{ marginTop: 10 }} data-testid="crm-more-sources">
              <button type="button" onClick={() => void findMore()} disabled={moreBusy} style={plainBtn}>{moreBusy ? "Searching the web..." : "Find more sources"}</button>
              <span style={{ fontSize: 12, color: "var(--ui-text-muted)", marginLeft: 8 }}>Public LinkedIn profile, team and about pages. Nothing behind a login.</span>
              {moreMsg && <div role="status" style={{ fontSize: 12, marginTop: 4 }}>{moreMsg}</div>}
              {photo && <img src={photo} alt="Public profile" referrerPolicy="no-referrer" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginTop: 6 }} />}
              {found.length > 0 && !data?.sources.some((s) => found.some((f) => f.url === s.url)) && (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {found.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>{f.label}</a>{f.detail ? <span style={{ color: "var(--ui-text-muted)" }}> - {f.detail}</span> : null}</li>)}
                </ul>
              )}
            </div>
          )}
          {backend.kind === "bf" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => void createTask()} style={plainBtn}>Create follow-up task</button>
              {taskMsg ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{taskMsg}</span> : null}
            </div>
          )}
        </>
      )}
      {!data && !loading && !err && <div style={{ marginTop: 6, fontSize: 12, color: "var(--ui-text-muted)" }}>No summary yet.</div>}
    </section>
  );
}

const STAGE_LABEL: Record<string, string> = { lead: "Lead", demo_started: "Demo started", demo_finished: "Demo finished", signed_up: "Signed up", paying: "Paying", lost: "Lost" };

export function CrmKsLicenseeCard({ backend, contactId }: { backend: CrmBackend; contactId: string }) {
  const [info, setInfo] = useState<KsLicensee | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    crmUnified(backend).ksLicensee(contactId).then((r) => { if (alive) setInfo(r && typeof r === "object" ? r : null); }).catch(() => { if (alive) setInfo(null); });
    return () => { alive = false; };
  }, [backend, contactId]);
  const row = (k: string, v: string | number | null | undefined) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "2px 0" }}>
      <span style={{ color: "var(--ui-text-muted)" }}>{k}</span><span style={{ textAlign: "right" }}>{v == null || v === "" ? "-" : v}</span>
    </div>
  );
  return (
    <section style={{ marginTop: 16 }} data-testid="crm-ks-licensee">
      <h3 style={{ margin: "0 0 6px" }}>Keystone licence</h3>
      {info === undefined && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
      {info === null && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No Keystone licence details yet.</div>}
      {info && (
        <>
          {row("Stage", info.stage ? STAGE_LABEL[info.stage] ?? info.stage : null)}
          {row("Brokerage", info.companyName)}
          {row("Plan", info.plan)}
          {row("Seats", info.seats)}
          {row("Status", info.status)}
          {row("Demo", info.demo.completedAt ? `Finished ${info.demo.completedAt.slice(0, 10)}` : info.demo.openedAt ? `${info.demo.steps} step(s), opened ${info.demo.openedAt.slice(0, 10)}` : "Not started")}
          {row("Payment", info.payment.status)}
          {info.payment.lastAt && row("Last payment", `${info.payment.lastAt.slice(0, 10)}${info.payment.summary ? ` - ${info.payment.summary}` : ""}`)}
          {info.lastEvent.summary && row("Latest", info.lastEvent.summary)}
        </>
      )}
    </section>
  );
}

const card: CSSProperties = { marginBottom: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
const label: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" };
