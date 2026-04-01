import { apiClient } from "@/lib/apiClient";

export const getOffers = (applicationId: string) =>
  apiClient(`/api/offers?applicationId=${applicationId}`);
