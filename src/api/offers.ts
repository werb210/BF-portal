import { apiRequest } from "@/lib/api";

export const getOffers = (applicationId: string) =>
  apiRequest("get", `/offers?applicationId=${applicationId}`);
