import { apiRequest } from "@/api/client";

export const getOffers = (applicationId: string) =>
  apiRequest(`/api/offers?applicationId=${applicationId}`);
