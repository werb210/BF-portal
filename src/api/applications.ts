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

export async function getApplications() {
  const res = await api<Application[]>("/api/applications");
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function sendToLender(id: string, lenders: string[]) {
  const res = await api<unknown>(`/api/applications/${id}/send`, {
    method: "POST",
    body: { lenders },
  });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function createApplication(payload: unknown) {
  const res = await api<Application>("/api/applications", {
    method: "POST",
    body: payload,
  });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function fetchPortalApplication<T = Application>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}`, options?.params);
  const res = await api<T>(requestUrl, { signal: options?.signal });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function updatePortalApplication(id: string, body: any) {
  const res = await api<Application>(`/api/applications/${id}`, {
    method: "PUT",
    body,
  });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function fetchApplicationDetails<T = ApplicationDetail>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}/details`, options?.params);
  const res = await api<T>(requestUrl, { signal: options?.signal });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function fetchApplicationAudit<T = AuditEntry[]>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}/audit`, options?.params);
  const res = await api<T>(requestUrl, { signal: options?.signal });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function openPortalApplication(id: string) {
  const res = await api<Application>(`/api/applications/${id}/open`, {
    method: "POST",
  });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}
