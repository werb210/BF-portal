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

const pipelineFallback: PipelineOverview = {
  newApplications: 0,
  inReview: 0,
  requiresDocs: 0,
  sentToLender: 0,
  offersReceived: 0,
  closed: 0,
  declined: 0,
};

const actionsFallback: UrgentActions = {
  waitingOver24h: 0,
  missingDocuments: 0,
  offersExpiring: 0,
  awaitingClientResponse: 0,
};

const documentHealthFallback: DocumentHealth = {
  missingBankStatements: 0,
  missingArAging: 0,
  rejectedDocuments: 0,
};

const lenderActivityFallback: LenderActivity = {
  recentSubmissions: 0,
  awaitingLenderResponse: 0,
  declinedSubmissions: 0,
};

const offersFallback: OfferActivity = {
  newOffers: 0,
  acceptedOffers: 0,
  expiringOffers: 0,
};

const metricsFallback: DealMetrics = {
  averageDealSize: 0,
  approvalRate: 0,
  averageApprovalTimeDays: 0,
  lenderResponseTimeDays: 0,
};

export const dashboardApi = {
  getPipeline: async () => pipelineFallback,
  getActions: async () => actionsFallback,
  getDocumentHealth: async () => documentHealthFallback,
  getLenderActivity: async () => lenderActivityFallback,
  getOffers: async () => offersFallback,
  getMetrics: async () => metricsFallback,
};
