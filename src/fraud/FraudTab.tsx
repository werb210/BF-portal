// BF_PORTAL_v846_FRAUD - the application's "Fraud check" tab (ported from Keystone; all 15 checks, no plans). Shows the
// fraud score, a red / amber / green badge per document with its reasons, every check with its result, the network
// map and the lender pre-screen. (No live-bank comparison: Boreal does not use Flinks, so there is no check 3.)
// Results are hints for a human to review, never a verdict - the page says so.
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import toast from "react-hot-toast";
import { fraudApi, type FraudCheck, type FraudDocument, type FraudOverview, type FraudScore, type Network, type Reason } from "@/fraud/fraudApi";
import { BAND_STYLE, chipStyle, noticeStyle } from "@/fraud/status";
import NetworkGraph from "@/fraud/NetworkGraph";
import { card, muted, secondaryButton } from "@/fraud/ui";

const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };

const say = (kind: "success" | "error", text: string) => { try { toast[kind](text); } catch { /* no toaster mounted */ } };

export function StatusChip({ status, testId }: { status: string; testId?: string }) {
  const s = chipStyle(status);
  return (
    <span data-testid={testId} data-status={status} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: "18px", background: s.bg, color: s.fg, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Reasons({ reasons, quietInfo = false }: { reasons: Reason[] | undefined; quietInfo?: boolean }) {
  const list = (reasons ?? []).filter((r) => !(quietInfo && r.severity === "info" && (reasons ?? []).some((x) => x.severity !== "info")));
  if (!list.length) return null;
  return (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
      {list.map((r, i) => (
        <li key={`${r.code}-${i}`} style={{ color: "var(--ui-text)", fontWeight: r.severity === "red" ? 700 : 400 }}>
          {r.severity === "red" ? "Concern: " : r.severity === "amber" ? "Check: " : ""}{r.text}
        </li>
      ))}
    </ul>
  );
}

function ScoreCard({ score }: { score: FraudScore }) {
  const s = BAND_STYLE[score.band];
  return (
    <section style={card} data-testid="fraud-score">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div aria-label={`Fraud score ${score.score} out of 100`} style={{ minWidth: 92, textAlign: "center", padding: "8px 12px", borderRadius: 12, background: s.bg, color: s.fg, border: `2px solid ${s.border}` }}>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{score.score}</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>out of 100</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ ...h3, margin: 0 }}>Fraud score: {s.label}</h3>
          <p style={muted}>0 means no signs were found; 100 means very likely fraud. Based on {score.covered.length} check(s) that ran.</p>
        </div>
      </div>
      {score.reasons.length > 0 && (
        <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.55 }}>
          {score.reasons.slice(0, 6).map((r, i) => (
            <li key={i} style={{ color: "var(--ui-text)" }}><strong>{r.label}:</strong> {r.text}</li>
          ))}
        </ul>
      )}
      {score.not_covered.length > 0 && (
        <details style={{ marginTop: 10, fontSize: 13 }}>
          <summary style={{ cursor: "pointer", color: "var(--ui-text)", fontWeight: 600 }}>{score.not_covered.length} check(s) not covered</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {score.not_covered.map((c) => <li key={c.check} style={{ color: "var(--ui-text)" }}>{c.label}: {c.why}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

function DocumentsCard({ documents }: { documents: FraudDocument[] }) {
  return (
    <section style={card} data-testid="fraud-documents">
      <h3 style={h3}>Documents</h3>
      {documents.length === 0 ? <p style={muted}>No documents uploaded yet.</p> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {documents.map((d) => (
            <li key={d.document_id} style={{ padding: "10px 0", borderTop: "1px solid var(--ui-border)" }} data-testid={`fraud-doc-${d.document_id}`}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14, color: "var(--ui-text)", overflowWrap: "anywhere" }}>{d.filename ?? "Document"}</strong>
                {d.category && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{d.category.replace(/_/g, " ")}</span>}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Tamper scan</span>
                <StatusChip status={d.tamper?.status ?? "pending"} testId="doc-tamper-chip" />
                {d.statement_math && (<><span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Statement math</span><StatusChip status={d.statement_math.status} testId="doc-math-chip" /></>)}
              </div>
              <Reasons reasons={[...(d.tamper?.reasons ?? []), ...(d.statement_math?.reasons ?? [])]} quietInfo />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CheckRow({ check }: { check: FraudCheck }) {
  return (
    <li style={{ padding: "12px 0", borderTop: "1px solid var(--ui-border)" }} data-testid={`fraud-check-${check.key}`}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 14, color: "var(--ui-text)" }}>{check.label}</strong>
        <span style={{ flex: 1 }} />
        <StatusChip status={check.status} testId={`chip-${check.key}`} />
      </div>
      <p style={muted}>{check.description}</p>
      {check.status === "per_document" ? <p style={muted}>Results are shown for each document above.</p> : <Reasons reasons={check.reasons} />}
    </li>
  );
}

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return <section style={card} data-testid={testId}><h3 style={h3}>{title}</h3>{children}</section>;
}

export default function FraudTab({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<FraudOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [network, setNetwork] = useState<Network | null>(null);
  const [netError, setNetError] = useState<string | null>(null);
  const [prescreen, setPrescreen] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    try {
      const r = await fraudApi.overview(applicationId);
      if (!r || !Array.isArray(r.checks) || !Array.isArray(r.documents)) throw new Error("The fraud checks are not available on this server yet.");
      setData({ ...r, queue: r.queue ?? { queued: false, done_at: null, last_error: null } });
      setError(null);
    } catch (e) {
      setError((e as Error)?.message || "Could not load the fraud checks.");
    }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <p role="alert" style={noticeStyle("error")}>{error}</p>;
  if (!data) return <p role="status" style={{ color: "var(--ui-text)" }}>Loading fraud checks…</p>;

  const runAgain = async () => {
    setBusy(true);
    try {
      await fraudApi.run(applicationId);
      say("success", "The checks will run again in about a minute.");
      await load();
    } catch (e) {
      say("error", (e as Error)?.message || "Could not start the checks.");
    } finally { setBusy(false); }
  };
  const showNetwork = async () => {
    setNetError(null);
    try { setNetwork((await fraudApi.network(applicationId)).network); } catch (e) { setNetError((e as Error)?.message || "Could not load the network."); }
  };
  const togglePackage = async (include: boolean) => {
    try {
      await fraudApi.setPrescreen(applicationId, include);
      setData({ ...data, include_prescreen_in_package: include });
    } catch (e) {
      say("error", (e as Error)?.message || "Could not save.");
    }
  };
  const previewPrescreen = async () => {
    try { setPrescreen((await fraudApi.prescreen(applicationId)).lines); } catch (e) { say("error", (e as Error)?.message || "Could not load the pre-screen."); }
  };
  const copyPrescreen = () => {
    try { void navigator.clipboard?.writeText((prescreen ?? []).join("\n")); say("success", "Copied."); } catch { /* clipboard unavailable */ }
  };
  const lastChecked = data.queue.done_at ? new Date(data.queue.done_at).toLocaleString() : null;

  return (
    <div style={{ maxWidth: 980, color: "var(--ui-text)" }} data-testid="fraud-tab">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0, color: "var(--ui-text)" }}>Fraud check</h2>
        <span style={{ flex: 1 }} />
        <span role="status" style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {data.queue.queued ? "Checks are running…" : lastChecked ? `Last checked ${lastChecked}` : "Not checked yet"}
        </span>
        <button type="button" style={secondaryButton} disabled={busy} onClick={() => void runAgain()}>{busy ? "Starting…" : "Run checks again"}</button>
      </div>
      <p style={{ ...muted, margin: "0 0 14px" }}>These are signs worth a closer look, not a finding of fraud. Always review the documents yourself.</p>

      {data.score && <ScoreCard score={data.score} />}

      <DocumentsCard documents={data.documents} />

      <Section title="All checks" testId="fraud-checks">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{data.checks.filter((c) => c.key !== "fraud_16").map((c) => <CheckRow key={c.key} check={c} />)}</ul>
      </Section>

      <Section title="Fraud network map" testId="fraud-network">
        {network ? <NetworkGraph network={network} /> : <button type="button" style={secondaryButton} onClick={() => void showNetwork()}>Show the network map</button>}
        {netError && <p role="alert" style={noticeStyle("error")}>{netError}</p>}
      </Section>

      <Section title="Lender pre-screen" testId="fraud-prescreen">
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--ui-text)" }}>
          <input type="checkbox" checked={data.include_prescreen_in_package} onChange={(e) => void togglePackage(e.target.checked)} />
          Add the pre-screen page to the lender package
        </label>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={secondaryButton} onClick={() => void previewPrescreen()}>Preview the pre-screen</button>
          {prescreen && <button type="button" style={secondaryButton} onClick={copyPrescreen}>Copy text</button>}
        </div>
        {prescreen && <pre data-testid="prescreen-text" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5, background: "var(--ui-surface)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, marginTop: 10 }}>{prescreen.join("\n")}</pre>}
      </Section>
    </div>
  );
}
