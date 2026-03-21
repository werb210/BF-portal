import { apiClient, type RequestOptions } from "./httpClient";
import { withBusinessUnitQuery } from "@/lib/businessUnit";
import type { BusinessUnit } from "@/types/businessUnit";

export type NoteMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  mentions?: string[];
};

export const fetchNotesThread = (applicationId: string, businessUnit: BusinessUnit, options?: RequestOptions) =>
  apiClient.get<NoteMessage[]>(
    withBusinessUnitQuery(`/api/portal/applications/${applicationId}/notes`, businessUnit),
    options
  );

export const sendNoteMessage = (
  applicationId: string,
  body: string,
  businessUnit: BusinessUnit,
  mentions: string[] = []
) =>
  apiClient.post(withBusinessUnitQuery(`/api/portal/applications/${applicationId}/notes`, businessUnit), { body, mentions });

export const updateNoteMessage = (applicationId: string, noteId: string, body: string, businessUnit: BusinessUnit) =>
  apiClient.patch(
    withBusinessUnitQuery(`/api/portal/applications/${applicationId}/notes/${noteId}`, businessUnit),
    { body }
  );
