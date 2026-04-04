const pipelineFallback = {
    newApplications: 0,
    inReview: 0,
    requiresDocs: 0,
    sentToLender: 0,
    offersReceived: 0,
    closed: 0,
    declined: 0,
};
const actionsFallback = {
    waitingOver24h: 0,
    missingDocuments: 0,
    offersExpiring: 0,
    awaitingClientResponse: 0,
};
const documentHealthFallback = {
    missingBankStatements: 0,
    missingArAging: 0,
    rejectedDocuments: 0,
};
const lenderActivityFallback = {
    recentSubmissions: 0,
    awaitingLenderResponse: 0,
    declinedSubmissions: 0,
};
const offersFallback = {
    newOffers: 0,
    acceptedOffers: 0,
    expiringOffers: 0,
};
const metricsFallback = {
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
