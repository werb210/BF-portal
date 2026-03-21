import { apiClient, type ListResponse, type RequestOptions } from "./httpClient";
import type { ApplicationDetails, ApplicationAuditEvent, PortalApplicationRecord } from "@/types/application.types";
import { withBusinessUnitQuery } from "@/lib/businessUnit";
import type { BusinessUnit } from "@/types/businessUnit";

export type ApplicationSummary = {
  id: string;
  applicant: string;
  status: string;
  submittedAt: string;
};

export type ApplicationDocumentsResponse = {
  id: string;
  name: string;
  category: string;
  status: string;
  uploadedAt?: string;
  size?: number;
  version?: number;
}[];

export const fetchApplications = async (businessUnit: BusinessUnit) => {
  const res = await apiClient.getList<ApplicationSummary>(withBusinessUnitQuery("/applications", businessUnit));
  return res.items;
};

export const fetchApplicationDetails = (id: string, options?: RequestOptions) =>
  apiClient.get<ApplicationDetails>(`/applications/${id}`, options);

export const fetchPortalApplication = (id: string, options?: RequestOptions) =>
  apiClient.get<PortalApplicationRecord>(`/api/applications/${id}`, options);

export const updatePortalApplication = (id: string, updates: Partial<PortalApplicationRecord>) =>
  apiClient.patch<PortalApplicationRecord>(`/api/applications/${id}`, updates);

export const openPortalApplication = (id: string) =>
  apiClient.post(`/api/applications/${id}/open`, {});

export const fetchApplicationDocuments = async (id: string, options?: RequestOptions) => {
  const res: ListResponse<ApplicationDocumentsResponse[number]> = await apiClient.getList(
    `/applications/${id}/documents`,
    options
  );
  return res.items;
};

export const fetchApplicationAudit = async (id: string, options?: RequestOptions) => {
  const res = await apiClient.getList<ApplicationAuditEvent>(`/applications/${id}/audit`, options);
  return res.items;
};
