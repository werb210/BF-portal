import { apiFetch } from "@/api/apiFetch";

export type PipelineOverview = {
  newApplications: number;
  inReview: number;
  requiresDocs: number;
  sentToLender: number;
  offersReceived: number;
  closed: number;
  declined: number;
};

export type UrgentActions = {
  waitingOver24h: number;
  missingDocuments: number;
  offersExpiring: number;
  awaitingClientResponse: number;
};

export type DocumentHealth = {
  missingBankStatements: number;
  missingArAging: number;
  rejectedDocuments: number;
};

export type LenderActivity = {
  recentSubmissions: number;
  awaitingLenderResponse: number;
  declinedSubmissions: number;
};

export type OfferActivity = {
  newOffers: number;
  acceptedOffers: number;
  expiringOffers: number;
};

export type DealMetrics = {
  averageDealSize: number;
  approvalRate: number;
  averageApprovalTimeDays: number;
  lenderResponseTimeDays: number;
};

const withFallback = async <T>(request: Promise<Response>, fallback: T): Promise<T> => {
  try {
    const response = await request;
    if (!response.ok) {
      return fallback;
    }

    const result = (await response.json()) as unknown;
    if (result && typeof result === "object") {
      return { ...fallback, ...(result as Record<string, unknown>) } as T;
    }

    return fallback;
  } catch {
    return fallback;
  }
};

export const dashboardApi = {
  getPipeline: () =>
    withFallback<PipelineOverview>(apiFetch("/api/dashboard/pipeline"), {
      newApplications: 0,
      inReview: 0,
      requiresDocs: 0,
      sentToLender: 0,
      offersReceived: 0,
      closed: 0,
      declined: 0
    }),
  getActions: () =>
    withFallback<UrgentActions>(apiFetch("/api/dashboard/actions"), {
      waitingOver24h: 0,
      missingDocuments: 0,
      offersExpiring: 0,
      awaitingClientResponse: 0
    }),
  getDocumentHealth: () =>
    withFallback<DocumentHealth>(apiFetch("/api/dashboard/document-health"), {
      missingBankStatements: 0,
      missingArAging: 0,
      rejectedDocuments: 0
    }),
  getLenderActivity: () =>
    withFallback<LenderActivity>(apiFetch("/api/dashboard/lender-activity"), {
      recentSubmissions: 0,
      awaitingLenderResponse: 0,
      declinedSubmissions: 0
    }),
  getOffers: () =>
    withFallback<OfferActivity>(apiFetch("/api/dashboard/offers"), {
      newOffers: 0,
      acceptedOffers: 0,
      expiringOffers: 0
    }),
  getMetrics: () =>
    withFallback<DealMetrics>(apiFetch("/api/dashboard/metrics"), {
      averageDealSize: 0,
      approvalRate: 0,
      averageApprovalTimeDays: 0,
      lenderResponseTimeDays: 0
    })
};
