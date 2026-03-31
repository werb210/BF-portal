import { apiRequest } from "@/lib/apiClient";

export const getOffers = (applicationId: string) =>
  apiRequest(`/api/offers?applicationId=${applicationId}`);
