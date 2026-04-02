import api from "@/lib/apiClient";
import { requireAuth } from "@/utils/requireAuth";

export const getApplications = async () => {
  requireAuth();
  return api.get<unknown[]>("/api/applications");
};

export const sendToLender = async (id: string, lenders: string[]) => {
  requireAuth();

  return api.post<unknown>(
    `/api/applications/${id}/send`,
    {
      lenders,
    },
  );
};

export const createApplication = async (payload: unknown) => {
  requireAuth();
  return api.post<unknown>("/api/applications", payload);
};
