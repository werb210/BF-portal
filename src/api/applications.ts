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

// BF_PORTAL_BLOCK_v86_ROUTING_DRAWER_CATEGORIES_TOPBAR_v1
// /api/applications/:id returns {application, documents} where wizard
// fields live at application.metadata.business / .applicant / .kyc and
// at application.metadata.formData.*. The drawer's normalizeFormState()
// looked for those keys at the root and always read empty.
// /api/applications/:id/details promotes business / businessDetails /
// applicantInfo / kyc / financialProfile to the root (per server
// BF_DETAILS_FORMDATA_FALLBACK_v33) and is the canonical drawer-shaped
// read. Without this fix the Application tab is empty after every
// successful submission.

export function fetchPortalApplication<T = Application>(id: string, options?: ApplicationRequestOptions) {
  const requestUrl = withParams(`/api/applications/${id}/details`, options?.params);
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

// BF_PORTAL_BLOCK_v300_OPEN_APPLICATION_URL_v1
// Server exposes the staff "I opened this card" signal at
// POST /api/portal/applications/:id/open (see BF-Server v205 in
// src/routes/portal.ts). The old URL /api/applications/:id/open is
// 404 on the server, so the openApplicationForStaff transition
// (Received -> In Review + first_opened_at stamp) silently failed
// every time staff opened an application card from this route.
export const openPortalApplication = (id: string) =>
  api<Application>(`/api/portal/applications/${id}/open`, {
    method: "POST",
  });
