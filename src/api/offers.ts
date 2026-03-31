import { apiRequest } from "@/lib/api";

export const getOffers = (applicationId: string) =>
  apiRequest(`/api/offers?applicationId=${applicationId}`);
