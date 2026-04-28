// BF_CREDIT_SUMMARY_UI_v46 — shared editor for both drawer + detail-page tabs.
// Renders all 6 sections. Inline-editable narratives for transaction,
// business_overview, financial_overview, banking_analysis, and recommendation.
// application_overview is a structured read-only display.
// Buttons: Regenerate, Save Draft, Submit. NO lock UI (ruling 10).
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  fetchCreditSummary,
  regenerateCreditSummary,
  saveCreditSummary,
  submitCreditSummary,
  type CreditSummarySections,
  type FetchResponse,
} from "@/api/credit";
import { getErrorMessage } from "@/utils/errors";

interface Props {
  applicationId: string;
}

const fmtMoney = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(Number(n))
    ? "—"
    : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function ApplicationOverviewView({
  ov,
}: {
  ov: CreditSummarySections["application_overview"];
}) {
  const fields: { label: string; value: string | number | null }[] = [
    { label: "Applicant", value: ov.applicant_name },
    { label: "Address", value: ov.address },
    { label: "Principals", value: ov.principals.join(", ") || null },
    { label: "Assets", value: ov.assets },
    { label: "Transaction", value: ov.transaction_type },
    { label: "Loan", value: ov.loan_amount === null ? null : fmtMoney(ov.loan_amount) },
    { label: "Term", value: ov.term },
    { label: "Industry", value: ov.industry },
    { label: "Structure", value: ov.structure },
    { label: "Owner", value: ov.owner },
    { label: "Advance", value: ov.advance === null ? null : fmtMoney(ov.advance) },
    { label: "LTV", value: ov.ltv === null ? null : `${ov.ltv}%` },
    { label: "Website", value: ov.website },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="application-overview">
      {fields.map((f) => (
        <div key={f.label} className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-gray-500">{f.label}</span>
          <span className="text-sm">{f.value === null || f.value === "" ? "—" : f.value}</span>
        </div>
      ))}
    </div>
  );
}

function FinancialTableView({
  table,
}: {
  table: CreditSummarySections["financial_overview"]["table"];
}) {
  if (!table.headers.length || !table.rows.length) {
    return <p className="text-sm text-gray-500">No financial data extracted yet.</p>;
  }
  return (
    <div className="overflow-x-auto" data-testid="financial-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Metric</th>
            {table.headers.map((h) => (
              <th key={h} className="py-1 text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-b">
              <td className="py-1">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="py-1 text-right">
                  {v === null ? "—" : fmtMoney(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankingMetricsView({
  metrics,
}: {
  metrics: CreditSummarySections["banking_analysis"]["metrics"];
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4" data-testid="banking-metrics">
      <div>
        <dt className="text-xs text-gray-500">Avg balance</dt>
        <dd>{fmtMoney(metrics.avg_balance)}</dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500">Monthly revenue</dt>
        <dd>{fmtMoney(metrics.monthly_revenue)}</dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500">NSF events</dt>
        <dd>{metrics.nsf_count ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500">Trend</dt>
        <dd>{metrics.revenue_trend ?? "—"}</dd>
      </div>
    </dl>
  );
}

export default function CreditSummaryEditor({ applicationId }: Props) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["credit-summary", applicationId], [applicationId]);
  const { data, isLoading, error } = useQuery<FetchResponse>({
    queryKey,
    queryFn: ({ signal }) => fetchCreditSummary(applicationId, { signal }),
    enabled: Boolean(applicationId),
  });

  const [draft, setDraft] = useState<CreditSummarySections | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Initialise draft when server data arrives or when it changes (after regenerate).
  useEffect(() => {
    if (data?.credit_summary?.sections) {
      setDraft(data.credit_summary.sections);
    }
  }, [data?.credit_summary?.id, data?.credit_summary?.version]);

  const regenerate = useMutation({
    mutationFn: () => regenerateCreditSummary(applicationId),
    onSuccess: (res) => {
      qc.setQueryData<FetchResponse>(queryKey, (prev) =>
        prev ? { ...prev, credit_summary: res.credit_summary } : prev
      );
      setDraft(res.credit_summary.sections);
      setStatusMsg("Regenerated.");
    },
    onError: (err) => setStatusMsg(`Regenerate failed: ${getErrorMessage(err, "unknown error")}`),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("nothing to save");
      return saveCreditSummary(applicationId, draft);
    },
    onSuccess: (res) => {
      qc.setQueryData<FetchResponse>(queryKey, (prev) =>
        prev ? { ...prev, credit_summary: res.credit_summary } : prev
      );
      setStatusMsg("Draft saved.");
    },
    onError: (err) => setStatusMsg(`Save failed: ${getErrorMessage(err, "unknown error")}`),
  });

  const submitMut = useMutation({
    mutationFn: () => submitCreditSummary(applicationId),
    onSuccess: (res) => {
      qc.setQueryData<FetchResponse>(queryKey, (prev) =>
        prev ? { ...prev, credit_summary: res.credit_summary } : prev
      );
      setStatusMsg("Submitted.");
    },
    onError: (err) => setStatusMsg(`Submit failed: ${getErrorMessage(err, "unknown error")}`),
  });

  if (!applicationId) return <div>Select an application to view credit summary.</div>;
  if (isLoading) return <div>Loading credit summary…</div>;
  if (error) return <div>{getErrorMessage(error, "Unable to load credit summary.")}</div>;
  if (!draft || !data) return <div>No credit summary available.</div>;

  const submitting = submitMut.isPending;
  const saving = save.isPending;
  const regenerating = regenerate.isPending;
  const status = data.credit_summary.status;

  const updateNarrative = (
    section: "transaction" | "business_overview" | "financial_overview" | "banking_analysis" | "recommendation",
    value: string
  ) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d } as CreditSummarySections;
      if (section === "financial_overview") {
        next.financial_overview = { ...next.financial_overview, narrative: value };
      } else if (section === "banking_analysis") {
        next.banking_analysis = { ...next.banking_analysis, narrative: value };
      } else if (section === "recommendation") {
        next.recommendation = { ...next.recommendation, narrative: value };
      } else if (section === "transaction") {
        next.transaction = { narrative: value };
      } else {
        next.business_overview = { narrative: value };
      }
      return next;
    });
  };

  return (
    <div className="space-y-4" data-testid="credit-summary-editor">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Credit Summary</h2>
          <p className="text-xs text-gray-500">
            Status: <span data-testid="credit-summary-status">{status}</span> · Version {data.credit_summary.version}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => regenerate.mutate()}
            disabled={regenerating || saving || submitting}
            data-testid="regenerate-btn"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => save.mutate()}
            disabled={regenerating || saving || submitting}
            data-testid="save-draft-btn"
          >
            {saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            onClick={() => submitMut.mutate()}
            disabled={regenerating || saving || submitting}
            data-testid="submit-btn"
          >
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {statusMsg && <div className="text-sm text-gray-700" data-testid="credit-summary-status-msg">{statusMsg}</div>}

      <Card title="Application Overview">
        <ApplicationOverviewView ov={draft.application_overview} />
      </Card>

      <Card title="Transaction">
        <textarea
          className="min-h-[80px] w-full rounded border p-2 text-sm"
          value={draft.transaction.narrative}
          onChange={(e) => updateNarrative("transaction", e.target.value)}
          data-testid="transaction-narrative"
        />
      </Card>

      <Card title="Business Overview">
        <textarea
          className="min-h-[120px] w-full rounded border p-2 text-sm"
          value={draft.business_overview.narrative}
          onChange={(e) => updateNarrative("business_overview", e.target.value)}
          data-testid="business-overview-narrative"
        />
      </Card>

      <Card title="Financial Overview">
        <textarea
          className="mb-3 min-h-[80px] w-full rounded border p-2 text-sm"
          value={draft.financial_overview.narrative}
          onChange={(e) => updateNarrative("financial_overview", e.target.value)}
          data-testid="financial-overview-narrative"
        />
        <FinancialTableView table={draft.financial_overview.table} />
      </Card>

      <Card title="Banking Analysis">
        <textarea
          className="mb-3 min-h-[80px] w-full rounded border p-2 text-sm"
          value={draft.banking_analysis.narrative}
          onChange={(e) => updateNarrative("banking_analysis", e.target.value)}
          data-testid="banking-analysis-narrative"
        />
        <BankingMetricsView metrics={draft.banking_analysis.metrics} />
      </Card>

      <Card title="Recommendation">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Recommended action: {draft.recommendation.recommended_action}
        </p>
        <textarea
          className="min-h-[100px] w-full rounded border p-2 text-sm"
          value={draft.recommendation.narrative}
          onChange={(e) => updateNarrative("recommendation", e.target.value)}
          data-testid="recommendation-narrative"
        />
      </Card>
    </div>
  );
}
