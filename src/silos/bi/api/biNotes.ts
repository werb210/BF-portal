// BI_NOTES_UI_v47 — BI silo notes API client. Path resolves to BI-Server via
// BF_SILO_API_ROUTING_v43 (any /api/v1/* path).
import { api } from "@/api";

export interface BINote {
  id: string;
  application_id: string;
  body: string;
  owner_user_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export const listBINotes = (applicationId: string, options?: { signal?: AbortSignal }) =>
  api.get<{ ok: true; items: BINote[] }>(
    `/api/v1/bi/applications/${encodeURIComponent(applicationId)}/notes`,
    options
  );

export const createBINote = (applicationId: string, body: string) =>
  api.post<{ ok: true; data: BINote }>(
    `/api/v1/bi/applications/${encodeURIComponent(applicationId)}/notes`,
    { body }
  );

export const updateBINote = (applicationId: string, noteId: string, body: string) =>
  api.patch<{ ok: true; data: BINote }>(
    `/api/v1/bi/applications/${encodeURIComponent(applicationId)}/notes/${encodeURIComponent(noteId)}`,
    { body }
  );

export const deleteBINote = (applicationId: string, noteId: string) =>
  api.delete<{ ok: true; id: string }>(
    `/api/v1/bi/applications/${encodeURIComponent(applicationId)}/notes/${encodeURIComponent(noteId)}`
  );
