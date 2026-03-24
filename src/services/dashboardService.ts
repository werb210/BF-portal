export async function disabledFeature() {
  return null;
}

export const getDashboardMetrics = disabledFeature;
export const loadDashboard = getDashboardMetrics;

export async function getPipeline() {
  return [];
}

export const loadPipeline = getPipeline;

export async function getOffers() {
  return [];
}

export const loadOffers = getOffers;
