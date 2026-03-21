import { DOCUMENT_CONTRACT } from "@/contracts";
import { apiClient, type RequestOptions } from "./httpClient";
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

const DOCUMENTS_BASE = DOCUMENT_CONTRACT.UPLOAD.replace(/\/upload$/, "");

export const fetchDocumentPresign = (documentId: string, options?: RequestOptions) =>
  apiClient.get<DocumentPresignResponse>(`${DOCUMENTS_BASE}/${documentId}/presign`, options);

export const fetchDocumentRequirements = (applicationId: string, options?: RequestOptions) =>
  apiClient.get<DocumentRequirementResponse>(`/api/applications/${applicationId}/documents`, options);

export const updateDocumentStatus = (documentId: string, status: DocumentStatus, reason?: string) =>
  apiClient.patch(`/documents/${documentId}/status`, { status, reason });

export const acceptDocument = (documentId: string) => apiClient.post(`/documents/${documentId}/accept`);

export const rejectDocument = (documentId: string, reason?: string) =>
  apiClient.post(`/documents/${documentId}/reject`, { reason });

export const restoreDocumentVersion = (documentId: string, version: number) =>
  apiClient.post(`/documents/${documentId}/version/restore`, { version });

export const fetchDocumentVersions = (documentId: string, options?: RequestOptions) =>
  apiClient.get<DocumentVersion[]>(`/documents/${documentId}/versions`, options);
