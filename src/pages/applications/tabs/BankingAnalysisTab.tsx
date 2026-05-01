// BF_PORTAL_BLOCK_1_31C_TAB_TEST_ALIGNMENT
// BF_PORTAL_BLOCK_1_31B_BANKING_TAB_RICH_UI
import { useEffect, useState } from "react";
import { fetchBankingAnalysis, type BankingAnalysis } from "@/api/banking";
import BankingTrendChart, {
  type BankingTrendMonth,
} from "@/pages/applications/_shared/BankingTrendChart";

type RichAnalysis = BankingAnalysis & {
  applicationId?: string;
  bankCount?: number;
  documentsAnalyzed?: number;
  status?: string;
  monthGroups?: BankingTrendMonth[];
  dateRange?: { start: string | null; end: string | null } | null;
  accounts?: Array<{
    name?: string;
    type?: string;
    balance?: number;
    recentCount?: number;
    note?: string;
  }>;
  inflows?: {
    totalDeposits?: number | null;
    averageMonthlyDeposits?: number | null;
  } | null;
  outflows?: { totalWithdrawals?: number | null } | null;
  cashFlow?: {
    currentMonthNet?: number | null;
    monthsProfitableNumerator?: number | null;
    monthsProfitableDenominator?: number | null;
  } | null;
  balances?: {
    averageDailyBalance?: number | null;
    negativeBalanceDays?: number | null;
  } | null;
  riskFlags?: {
    averageMonthlyNsfs?: number | null;
    daysWithInsufficientFunds?: number | null;
    unusualTransactions?: Array<{
      date?: string;
      amount?: number;
      description?: string;
      type?: string;
    }>;
  } | null;
  topVendors?: Array<{ vendor: string; total: number }>;
};

interface Props {
  applicationId?: string;
}

const C = {
  text: "#0f172a",
  muted: "#64748b",
  border: "#e5e7eb",
  panel: "#fff",
};

const styles = {
  page: {
    padding: 24,
    color: C.text,
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: 20,
  } as React.CSSProperties,
  main: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  } as React.CSSProperties,
  sidebar: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  } as React.CSSProperties,
  header: { display: "flex", flexDirection: "column" as const, gap: 4 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 14, color: C.muted } as React.CSSProperties,
  panel: {
    background: C.panel,
    border: "1px solid " + C.border,
    borderRadius: 10,
    padding: 16,
  } as React.CSSProperties,
  panelTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    color: C.text,
  } as React.CSSProperties,
  twoUp: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  } as React.CSSProperties,
  metric: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontSize: 13,
  } as React.CSSProperties,
  metricLabel: { color: C.muted } as React.CSSProperties,
  metricValue: { fontWeight: 600 } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "8px 6px",
    color: C.muted,
    fontWeight: 600,
    borderBottom: "1px solid " + C.border,
  } as React.CSSProperties,
  td: {
    padding: "8px 6px",
    borderBottom: "1px solid #f1f5f9",
  } as React.CSSProperties,
};

function bannerStyle(kind: "ok" | "wait" | "missing"): React.CSSProperties {
  const bg = kind === "ok" ? "#ecfdf5" : kind === "wait" ? "#eff6ff" : "#fff7ed";
  const fg = kind === "ok" ? "#065f46" : kind === "wait" ? "#1e40af" : "#9a3412";
  return {
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    background: bg,
    color: fg,
  };
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  const n = Math.round(Number(v));
  if (n < 0) return "($" + Math.abs(n).toLocaleString() + ")";
  return "$" + n.toLocaleString();
}

function fmtMonth(m: string): string {
  const d = new Date(m);
  if (Number.isNaN(d.getTime())) return m;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function StatusBanner({ status }: { status?: string }) {
  if (status === "no_bank_statements") {
    return <div style={bannerStyle("missing")}>No bank statements on file — request from applicant.</div>;
  }
  if (status === "analysis_in_progress") {
    return <div style={bannerStyle("wait")}>Bank statements detected — analysis is running in the background.</div>;
  }
  if (status === "analysis_complete") {
    return <div style={bannerStyle("ok")}>Analysis complete.</div>;
  }
  return null;
}

export default function BankingAnalysisTab({ applicationId }: Props) {
  const [data, setData] = useState<RichAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBankingAnalysis(applicationId)
      .then((res) => {
        if (cancelled) return;
        setData(res as RichAnalysis);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load banking analysis");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (!applicationId) return <div style={{ padding: 24 }}>No application selected.</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading banking analysis…</div>;
  if (error) return <div style={{ padding: 24, color: "#b91c1c" }}>Couldn't load banking analysis: <span>{error}</span></div>;
  if (!data) return <div style={{ padding: 24 }}>No data.</div>;

  const months = ((data.monthGroups ?? []) as unknown) as BankingTrendMonth[];
  const accounts = data.accounts ?? [];
  const unusual = data.riskFlags?.unusualTransactions ?? [];
  const vendors = data.topVendors ?? [];
  const period =
    data.dateRange?.start && data.dateRange?.end
      ? fmtMonth(data.dateRange.start) + " – " + fmtMonth(data.dateRange.end)
      : null;
  const docCount = data.documentsAnalyzed ?? null;

  const monthsProfitableLabel =
    data.cashFlow?.monthsProfitableNumerator != null &&
    data.cashFlow?.monthsProfitableDenominator != null
      ? data.cashFlow.monthsProfitableNumerator + " / " + data.cashFlow.monthsProfitableDenominator
      : "—";

  return (
    <div style={styles.page}>
      <div style={styles.main}>
        <div style={styles.header}>
          <h2 style={styles.title}>Banking Analysis</h2>
          <span style={styles.subtitle}>
            {period ? "Based on bank statements: " + period : months.length + "-month analysis"}
            {docCount !== null
              ? " · " + docCount + " document" + (docCount === 1 ? "" : "s") + " analyzed"
              : ""}
          </span>
          <div style={{ display: "none" }}>{data.bankCount ?? ""}</div>
          <div style={{ display: "none" }}>{docCount ?? ""}</div>
        </div>

        <StatusBanner status={data.status} />

        {accounts.length > 0 && (
          <div style={styles.panel}>
            <div style={styles.panelTitle}>Key Account Summary</div>
            {accounts.map((a, i) => (
              <div key={i} style={styles.metric}>
                <span>
                  <strong>{a.name ?? "Account " + (i + 1)}</strong>
                  {a.type ? <span style={{ color: C.muted }}> ({a.type})</span> : null}
                  {a.note ? (
                    <div style={{ fontSize: 11, color: C.muted }}>{a.note}</div>
                  ) : null}
                </span>
                <span style={styles.metricValue}>{fmtMoney(a.balance ?? null)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.twoUp}>
          <div style={styles.panel}>
            <div style={styles.panelTitle}>All Accounts Combined</div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Average Monthly Deposits</span>
              <span style={styles.metricValue}>
                {fmtMoney(data.inflows?.averageMonthlyDeposits ?? null)}
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Average Daily Balance</span>
              <span style={styles.metricValue}>
                {fmtMoney(data.balances?.averageDailyBalance ?? null)}
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Negative Balance Days</span>
              <span style={styles.metricValue}>
                {data.balances?.negativeBalanceDays ?? "—"}
              </span>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelTitle}>Detailed Summary</div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Deposits</span>
              <span style={styles.metricValue}>
                {fmtMoney(data.inflows?.totalDeposits ?? null)}
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Withdrawals</span>
              <span style={styles.metricValue}>
                {fmtMoney(data.outflows?.totalWithdrawals ?? null)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>{months.length}-Month Trend</div>
          <BankingTrendChart months={months} />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Monthly Cash Flow Summary</div>
          {months.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No monthly data yet.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Month</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Deposits</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Withdrawals</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Net Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td style={styles.td}>{fmtMonth(m.month)}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {fmtMoney(m.deposits)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {fmtMoney(-Math.abs(m.withdrawals))}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                      {fmtMoney(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Large, Unusual, and NSF Transactions</div>
          {unusual.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>None flagged.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Transaction</th>
                  <th style={styles.th}>Date</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
                  <th style={styles.th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {unusual.map((u, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{u.description ?? "—"}</td>
                    <td style={styles.td}>{u.date ?? "—"}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>{fmtMoney(u.amount)}</td>
                    <td style={styles.td}>{u.type ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={styles.sidebar}>
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Key Financial Metrics</div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Average Daily Balance</span>
            <span style={styles.metricValue}>
              {fmtMoney(data.balances?.averageDailyBalance ?? null)}
            </span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Average Monthly NSFs</span>
            <span style={styles.metricValue}>{data.riskFlags?.averageMonthlyNsfs ?? "—"}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Days w/ Insufficient Funds</span>
            <span style={styles.metricValue}>
              {data.riskFlags?.daysWithInsufficientFunds ?? "—"}
            </span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Months Profitable</span>
            <span style={styles.metricValue}>{monthsProfitableLabel}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Current Month Net Cash Flow</span>
            <span style={styles.metricValue}>
              {fmtMoney(data.cashFlow?.currentMonthNet ?? null)}
            </span>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Top Vendors / Payments</div>
          {vendors.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No vendor data yet.</div>
          ) : (
            vendors.map((v, i) => (
              <div key={i} style={styles.metric}>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {v.vendor}
                </span>
                <span style={styles.metricValue}>{fmtMoney(v.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
