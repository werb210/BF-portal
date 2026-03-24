import { apiRequest } from "@/lib/api";

export const getOffers = (applicationId: string) =>
  apiRequest(`/offers?applicationId=${applicationId}`);
