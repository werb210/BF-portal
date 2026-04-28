// BF_NOTES_UI_v49 — application-scoped notes client (Block 47 endpoints).
import { api } from "@/api";

export interface AppNote {
  id: string;
  body: string;
  application_id: string | null;
  silo: string | null;
  owner_id: string | null;
  owner_name: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export interface ListResponse { ok: true; items: AppNote[] }
export interface OneResponse  { ok: true; data: AppNote }
export interface DeleteResponse { ok: true; id: string }

export const listApplicationNotes = (applicationId: string, options?: { signal?: AbortSignal }) =>
  api.get<ListResponse>(`/api/applications/${encodeURIComponent(applicationId)}/notes`, options);

export const createApplicationNote = (applicationId: string, body: string) =>
  api.post<OneResponse>(`/api/applications/${encodeURIComponent(applicationId)}/notes`, { body });

export const updateApplicationNote = (applicationId: string, noteId: string, body: string) =>
  api.patch<OneResponse>(`/api/applications/${encodeURIComponent(applicationId)}/notes/${encodeURIComponent(noteId)}`, { body });

export const deleteApplicationNote = (applicationId: string, noteId: string) =>
  api.delete<DeleteResponse>(`/api/applications/${encodeURIComponent(applicationId)}/notes/${encodeURIComponent(noteId)}`);
