import { api } from "@/api";
import { getAuthToken } from "@/lib/authToken";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  assignedUserIds?: string[];
  silo?: string;
  relatedApplicationId?: string;
  relatedContactId?: string;
  meetingLink?: string;
  category?: string;
};

export const fetchLocalEvents = async () => {
  if (!getAuthToken()) throw new Error("Not authenticated");
  const res = await api.getList<CalendarEvent>("/api/calendar/events");
  return res;
};

export const createLocalEvent = (event: Partial<CalendarEvent>) =>
  api.post<CalendarEvent>("/api/calendar/events", event);

export const updateLocalEvent = (id: string, event: Partial<CalendarEvent>) =>
  api.patch<CalendarEvent>(`/api/calendar/events/${id}`, event);

export const deleteLocalEvent = (id: string) => api.delete<void>(`/api/calendar/events/${id}`);
