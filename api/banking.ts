import { apiClient, type RequestOptions } from "./httpClient";

export type BankingAnalysisMonthGroup = {
  year: string;
  months: string[];
};

export type BankingAnalysis = {
  bankingCompletedAt?: string | null;
  banking_completed_at?: string | null;
  monthsDetected?: string | number | BankingAnalysisMonthGroup[];
  monthsDetectedSummary?: string | number;
  monthGroups?: BankingAnalysisMonthGroup[];
  dateRange?: string;
  bankCount?: number;
  inflows?: {
    totalDeposits?: number | string;
    averageMonthlyDeposits?: number | string;
    topDepositSources?: Array<{ name: string; percentage?: number | string }>;
  };
  outflows?: {
    totalWithdrawals?: number | string;
    averageMonthlyWithdrawals?: number | string;
    topExpenseCategories?: Array<{ name: string; percentage?: number | string }>;
  };
  cashFlow?: {
    netCashFlowMonthlyAverage?: number | string;
    volatility?: string;
  };
  balances?: {
    averageDailyBalance?: number | string;
    lowestBalance?: number | string;
    nsfOverdraftCount?: number | string;
  };
  riskFlags?: {
    irregularDeposits?: string | number | boolean;
    revenueConcentration?: string | number | boolean;
    decliningBalances?: string | number | boolean;
    nsfOverdraftEvents?: string | number | boolean;
  };
};

export const fetchBankingAnalysis = (applicationId: string, options?: RequestOptions) =>
  apiClient.get<BankingAnalysis>(`/api/applications/${applicationId}/banking-analysis`, options);
