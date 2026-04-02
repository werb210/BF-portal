import { api } from "@/utils/api";
import type { ApplicationAuditEvent, ApplicationDetails, PortalApplicationRecord } from "@/types/application.types";

type Application = PortalApplicationRecord;
type ApplicationDetail = ApplicationDetails;
type AuditEntry = ApplicationAuditEvent;
type ApplicationRequestOptions = {
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | null | undefined>;
};

const withParams = (url: string, params?: ApplicationRequestOptions["params"]) => {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
};

export const getApplications = () => api<Application[]>("/api/applications");

export const sendToLender = (id: string, lenders: string[]) =>
  api<unknown>(`/api/applications/${id}/send`, {
    method: "POST",
    body: { lenders },
  });

export const createApplication = (payload: unknown) =>
  api<Application>("/api/applications", {
    method: "POST",
    body: payload as Record<string, unknown>,
  });

export function fetchPortalApplication<T = Application>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}`, options?.params);
  return api<T>(requestUrl, { signal: options?.signal });
}

export function updatePortalApplication(id: string, payload: Record<string, unknown>) {
  return api<Application>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchApplicationDetails<T = ApplicationDetail>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}/details`, options?.params);
  return api<T>(requestUrl, { signal: options?.signal });
}

export function fetchApplicationAudit<T = AuditEntry[]>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}/audit`, options?.params);
  return api<T>(requestUrl, { signal: options?.signal });
}

export const openPortalApplication = (id: string) =>
  api<Application>(`/api/applications/${id}/open`, {
    method: "POST",
  });
