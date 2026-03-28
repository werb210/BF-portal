import { useQuery } from "@tanstack/react-query";
import { fetchBankingAnalysis, type BankingAnalysis } from "@/api/banking";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";

const resolveValue = (value?: number | string | boolean | null) => (value === null || value === undefined ? "—" : value);

const BankingSkeleton = () => (
  <div className="drawer-tab drawer-tab__banking" role="status" aria-live="polite">
    <div className="drawer-metric-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="drawer-metric" key={`banking-skeleton-${index}`}>
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line" />
        </div>
      ))}
    </div>
    <div className="drawer-section">
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
    <div className="drawer-section">
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  </div>
);

const BankingTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const { data: applicationDetails } = useApplicationDetails();
  const { data: analysis, isLoading, error } = useQuery<BankingAnalysis>({
    queryKey: ["banking", applicationId, "analysis"],
    queryFn: ({ signal }) => fetchBankingAnalysis(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId)
  });

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view banking analysis.</div>;
  if (isLoading) return <BankingSkeleton />;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load banking analysis.")}</div>;

  const bankingCompletedAt = (applicationDetails as { banking_completed_at?: string | null } | null)?.banking_completed_at;
  const statementCount =
    (applicationDetails as { bankStatementCount?: number | null } | null)?.bankStatementCount ??
    (applicationDetails as { bank_statement_count?: number | null } | null)?.bank_statement_count ??
    (applicationDetails as { bankStatementsCount?: number | null } | null)?.bankStatementsCount ??
    (applicationDetails as { bank_statements_count?: number | null } | null)?.bank_statements_count ??
    null;
  const statusLabel = (() => {
    if (bankingCompletedAt === undefined) return "Unknown";
    if (bankingCompletedAt !== null) return "Completed";
    if (typeof statementCount !== "number") return "Unknown";
    if (statementCount < 6) return "Waiting for statements";
    return "Processing…";
  })();
  const monthGroups = Array.isArray(analysis?.monthsDetected) ? analysis?.monthsDetected : analysis?.monthGroups;
  const monthsDetectedValue = Array.isArray(analysis?.monthsDetected)
    ? resolveValue(analysis?.monthsDetectedSummary)
    : resolveValue(analysis?.monthsDetected);

  return (
    <div className="drawer-tab drawer-tab__banking">
      <div className="drawer-section" role="status" aria-live="polite">
        <div className="drawer-section__title">Status</div>
        <div className="drawer-section__body">{statusLabel}</div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Coverage Summary</div>
        <div className="drawer-section__body">
          {monthGroups?.length ? (
            <div className="drawer-list">
              {monthGroups.map((group) => (
                <div key={`${group.year}-${group.months.join("-")}`} className="drawer-list__item">
                  <strong>{group.year}</strong>
                  <div>{group.months.join(" • ")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="drawer-placeholder">No statement months detected.</div>
          )}
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Months detected</dt>
              <dd>{monthsDetectedValue}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Date range</dt>
              <dd>{resolveValue(analysis?.dateRange)}</dd>
            </div>
            {analysis?.bankCount && analysis.bankCount > 1 ? (
              <div className="drawer-kv-list__item">
                <dt>Bank count</dt>
                <dd>{resolveValue(analysis.bankCount)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Inflows</div>
        <div className="drawer-section__body">
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Total deposits (6-month)</dt>
              <dd>{resolveValue(analysis?.inflows?.totalDeposits)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Average monthly deposits</dt>
              <dd>{resolveValue(analysis?.inflows?.averageMonthlyDeposits)}</dd>
            </div>
          </dl>
          {analysis?.inflows?.topDepositSources?.length ? (
            <div className="drawer-list">
              {analysis.inflows.topDepositSources.map((source) => (
                <div key={`${source.name}-${source.percentage ?? "na"}`} className="drawer-list__item">
                  <strong>{source.name}</strong>
                  {source.percentage !== undefined ? ` — ${source.percentage}` : ""}
                </div>
              ))}
            </div>
          ) : (
            <div className="drawer-placeholder">No deposit sources reported.</div>
          )}
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Outflows</div>
        <div className="drawer-section__body">
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Total withdrawals (6-month)</dt>
              <dd>{resolveValue(analysis?.outflows?.totalWithdrawals)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Average monthly withdrawals</dt>
              <dd>{resolveValue(analysis?.outflows?.averageMonthlyWithdrawals)}</dd>
            </div>
          </dl>
          {analysis?.outflows?.topExpenseCategories?.length ? (
            <div className="drawer-list">
              {analysis.outflows.topExpenseCategories.map((category) => (
                <div key={`${category.name}-${category.percentage ?? "na"}`} className="drawer-list__item">
                  <strong>{category.name}</strong>
                  {category.percentage !== undefined ? ` — ${category.percentage}` : ""}
                </div>
              ))}
            </div>
          ) : (
            <div className="drawer-placeholder">No expense categories reported.</div>
          )}
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Cash Flow</div>
        <div className="drawer-section__body">
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Net cash flow (monthly average)</dt>
              <dd>{resolveValue(analysis?.cashFlow?.netCashFlowMonthlyAverage)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Volatility indicator</dt>
              <dd>{resolveValue(analysis?.cashFlow?.volatility)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Balances</div>
        <div className="drawer-section__body">
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Average daily balance</dt>
              <dd>{resolveValue(analysis?.balances?.averageDailyBalance)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Lowest balance</dt>
              <dd>{resolveValue(analysis?.balances?.lowestBalance)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>NSF / overdraft count</dt>
              <dd>{resolveValue(analysis?.balances?.nsfOverdraftCount)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="drawer-section">
        <div className="drawer-section__title">Risk Flags</div>
        <div className="drawer-section__body">
          <dl className="drawer-kv-list">
            <div className="drawer-kv-list__item">
              <dt>Irregular deposits</dt>
              <dd>{resolveValue(analysis?.riskFlags?.irregularDeposits)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Revenue concentration</dt>
              <dd>{resolveValue(analysis?.riskFlags?.revenueConcentration)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>Declining balances</dt>
              <dd>{resolveValue(analysis?.riskFlags?.decliningBalances)}</dd>
            </div>
            <div className="drawer-kv-list__item">
              <dt>NSF/overdraft events</dt>
              <dd>{resolveValue(analysis?.riskFlags?.nsfOverdraftEvents)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default BankingTab;
