import { api, type RequestOptions } from "@/api";
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
  api.get<NoteMessage[]>(
    withBusinessUnitQuery(`/applications/${applicationId}/notes`, businessUnit),
    options
  );

export const sendNoteMessage = (
  applicationId: string,
  body: string,
  businessUnit: BusinessUnit,
  mentions: string[] = []
) =>
  api.post(withBusinessUnitQuery(`/applications/${applicationId}/notes`, businessUnit), { body, mentions });

export const updateNoteMessage = (applicationId: string, noteId: string, body: string, businessUnit: BusinessUnit) =>
  api.patch(
    withBusinessUnitQuery(`/applications/${applicationId}/notes/${noteId}`, businessUnit),
    { body }
  );
