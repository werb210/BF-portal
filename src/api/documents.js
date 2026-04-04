import { requireAuth } from "@/utils/requireAuth";
import { api } from "@/api";
const DOCUMENTS_BASE = "/documents";
export const fetchDocumentPresign = (documentId, options) => api.get(`${DOCUMENTS_BASE}/${documentId}/presign`, options);
export const fetchDocumentRequirements = (applicationId, options) => api.get(`/applications/${applicationId}/documents`, options);
export const updateDocumentStatus = (documentId, status, reason) => api.patch(`/documents/${documentId}/status`, { status, reason });
export const acceptDocument = (documentId) => api.post(`/documents/${documentId}/accept`);
export const rejectDocument = (documentId, reason) => api.post(`/documents/${documentId}/reject`, { reason });
export const restoreDocumentVersion = (documentId, version) => api.post(`/documents/${documentId}/version/restore`, { version });
export const fetchDocumentVersions = (documentId, options) => api.get(`/documents/${documentId}/versions`, options);
export const getDocuments = async (applicationId) => {
    requireAuth();
    return api.get(`/api/documents/${applicationId}`);
};
