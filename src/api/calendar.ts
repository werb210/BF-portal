import { api } from "@/api";

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
  const res = await api.getList<CalendarEvent>("/calendar/events");
  return res;
};

export const createLocalEvent = (event: Partial<CalendarEvent>) =>
  api.post<CalendarEvent>("/calendar/events", event);

export const updateLocalEvent = (id: string, event: Partial<CalendarEvent>) =>
  api.patch<CalendarEvent>(`/calendar/events/${id}`, event);

export const deleteLocalEvent = (id: string) => api.delete<void>(`/calendar/events/${id}`);
