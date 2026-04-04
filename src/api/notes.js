import { api } from "@/api";
import { withBusinessUnitQuery } from "@/lib/businessUnit";
export const fetchNotesThread = (applicationId, businessUnit, options) => api.get(withBusinessUnitQuery(`/applications/${applicationId}/notes`, businessUnit), options);
export const sendNoteMessage = (applicationId, body, businessUnit, mentions = []) => api.post(withBusinessUnitQuery(`/applications/${applicationId}/notes`, businessUnit), { body, mentions });
export const updateNoteMessage = (applicationId, noteId, body, businessUnit) => api.patch(withBusinessUnitQuery(`/applications/${applicationId}/notes/${noteId}`, businessUnit), { body });
