// BF_BANKING_ANALYSIS_TAB_v52 — Bug 5 client-side. Replaces the Block-23
// placeholder. Calls GET /api/applications/:id/banking-analysis (BF-Server
// v52 r2) and renders the typed BankingAnalysis shape. Optional rich
// metrics (inflows/outflows/balances) are rendered when present and
// gracefully omitted when null in V1.
import { useEffect, useState } from "react";
import { fetchBankingAnalysis, type BankingAnalysis } from "@/api/banking";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: BankingAnalysis & { applicationId?: string; bankCount?: number; documentsAnalyzed?: number; status?: string } }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const panel: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fff",
  padding: 20,
  marginBottom: 16,
};

const label: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "#64748b",
  marginBottom: 4,
};

const value: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: "#0f172a" };

function fmtMoney(v: unknown): string | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function StatusBanner({ status, completedAt }: { status?: string; completedAt: string | null }) {
  const text =
    status === "no_bank_statements"
      ? "No bank statements on file yet — request from applicant."
      : status === "analysis_in_progress"
      ? "Bank statements detected. Analysis is running in the background."
      : status === "analysis_complete"
      ? `Analysis complete${completedAt ? ` at ${completedAt}` : ""}.`
      : "Banking analysis";
  const bg =
    status === "analysis_complete" ? "#ecfdf5" :
    status === "analysis_in_progress" ? "#eff6ff" :
    status === "no_bank_statements" ? "#fff7ed" : "#f8fafc";
  const fg =
    status === "analysis_complete" ? "#065f46" :
    status === "analysis_in_progress" ? "#1e40af" :
    status === "no_bank_statements" ? "#9a3412" : "#334155";
  return (
    <div style={{ ...panel, background: bg, color: fg, borderColor: "transparent" }}>
      <div style={{ fontWeight: 600 }}>{text}</div>
    </div>
  );
}

export default function BankingAnalysisTab({ applicationId }: { applicationId?: string } = {}) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  useEffect(() => {
    if (!applicationId) {
      setState({ kind: "empty" });
      return;
    }
    let alive = true;
    setState({ kind: "loading" });
    fetchBankingAnalysis(applicationId)
      .then((data) => {
        if (!alive) return;
        setState({ kind: "ready", data: data as any });
      })
      .catch((err: any) => {
        if (!alive) return;
        const msg = String(err?.message ?? "Could not load banking analysis.");
        setState({ kind: "error", message: msg });
      });
    return () => {
      alive = false;
    };
  }, [applicationId]);

  if (state.kind === "idle" || state.kind === "loading") {
    return <div style={{ padding: 20, color: "#64748b" }}>Loading banking analysis…</div>;
  }
  if (state.kind === "empty") {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>No application selected</div>
        <div style={{ color: "#475569" }}>Open an application to view its banking analysis.</div>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div style={{ ...panel, borderColor: "#fecaca", background: "#fef2f2" }}>
        <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>Couldn't load banking analysis</div>
        <div style={{ color: "#7f1d1d" }}>{state.message}</div>
      </div>
    );
  }

  const data = state.data;
  const completedAt = fmtDate(data.bankingCompletedAt ?? data.banking_completed_at);
  const inflows = data.inflows ?? null;
  const outflows = data.outflows ?? null;
  const cashFlow = data.cashFlow ?? null;
  const balances = data.balances ?? null;

  return (
    <div style={{ padding: "20px 24px" }}>
      <h2 style={{ marginTop: 0 }}>Banking Analysis</h2>
      <StatusBanner status={data.status} completedAt={completedAt} />

      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <div style={label}>Bank statements detected</div>
            <div style={value}>{typeof data.bankCount === "number" ? data.bankCount : "—"}</div>
          </div>
          <div>
            <div style={label}>Documents analyzed</div>
            <div style={value}>{typeof data.documentsAnalyzed === "number" ? data.documentsAnalyzed : "—"}</div>
          </div>
          <div>
            <div style={label}>Banking completed at</div>
            <div style={value}>{completedAt ?? "—"}</div>
          </div>
          <div>
            <div style={label}>Date range</div>
            <div style={value}>{data.dateRange ?? "—"}</div>
          </div>
        </div>
      </div>

      {(inflows || outflows || cashFlow || balances) && (
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Metrics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {inflows && (
              <div>
                <div style={label}>Avg monthly deposits</div>
                <div style={value}>{fmtMoney(inflows.averageMonthlyDeposits) ?? "—"}</div>
              </div>
            )}
            {outflows && (
              <div>
                <div style={label}>Avg monthly withdrawals</div>
                <div style={value}>{fmtMoney(outflows.averageMonthlyWithdrawals) ?? "—"}</div>
              </div>
            )}
            {cashFlow && (
              <div>
                <div style={label}>Net monthly cash flow</div>
                <div style={value}>{fmtMoney(cashFlow.netCashFlowMonthlyAverage) ?? "—"}</div>
              </div>
            )}
            {balances && (
              <div>
                <div style={label}>Avg daily balance</div>
                <div style={value}>{fmtMoney(balances.averageDailyBalance) ?? "—"}</div>
              </div>
            )}
            {balances && (
              <div>
                <div style={label}>NSF / overdraft events</div>
                <div style={value}>{String(balances.nsfOverdraftCount ?? "—")}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
