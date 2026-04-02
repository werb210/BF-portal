import { requireAuth } from "@/utils/requireAuth";
import { api, type RequestOptions } from "@/api";
import type { DocumentRequirementResponse, DocumentStatus } from "@/types/documents.types";

export type DocumentRecord = {
  id: string;
  name: string;
  category: string;
  status: string;
  uploadDate?: string;
  size?: number;
  version?: number;
};

export type DocumentPresignResponse = {
  url: string;
  expiresAt: string;
};

export type DocumentVersion = {
  id: string;
  version: number;
  uploadedAt: string;
  size?: number;
  status?: string;
};

const DOCUMENTS_BASE = "/documents";

export const fetchDocumentPresign = (documentId: string, options?: RequestOptions) =>
  api.get<DocumentPresignResponse>(`${DOCUMENTS_BASE}/${documentId}/presign`, options);

export const fetchDocumentRequirements = (applicationId: string, options?: RequestOptions) =>
  api.get<DocumentRequirementResponse>(`/applications/${applicationId}/documents`, options);

export const updateDocumentStatus = (documentId: string, status: DocumentStatus, reason?: string) =>
  api.patch(`/documents/${documentId}/status`, { status, reason });

export const acceptDocument = (documentId: string) => api.post(`/documents/${documentId}/accept`);

export const rejectDocument = (documentId: string, reason?: string) =>
  api.post(`/documents/${documentId}/reject`, { reason });

export const restoreDocumentVersion = (documentId: string, version: number) =>
  api.post(`/documents/${documentId}/version/restore`, { version });

export const fetchDocumentVersions = (documentId: string, options?: RequestOptions) =>
  api.get<DocumentVersion[]>(`/documents/${documentId}/versions`, options);


export const getDocuments = async (applicationId: string) => {
  requireAuth();
  return api.get<unknown>(`/api/documents/${applicationId}`);
};
