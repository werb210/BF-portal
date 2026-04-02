import api from "@/lib/apiClient";
import { requireAuth } from "@/utils/requireAuth";
import type { ApiClientOptions } from "@/lib/apiClient";

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

export const fetchPortalApplication = async <T = unknown>(id: string, options: ApiClientOptions = {}) => {
  requireAuth();
  return api.get<T>(`/api/applications/${id}`, options);
};

export const openPortalApplication = async <T = unknown>(id: string) => {
  requireAuth();
  return api.post<T>(`/api/applications/${id}/open`, {});
};

export const fetchApplicationDetails = async <T = unknown>(id: string, options: ApiClientOptions = {}) => {
  requireAuth();
  return api.get<T>(`/api/applications/${id}/details`, options);
};

export const updatePortalApplication = async <T = unknown>(id: string, payload: Record<string, unknown>) => {
  requireAuth();
  return api.patch<T>(`/api/applications/${id}`, payload);
};

export const fetchApplicationAudit = async <T = unknown[]>(id: string, options: ApiClientOptions = {}) => {
  requireAuth();
  return api.get<T>(`/api/applications/${id}/audit`, options);
};
