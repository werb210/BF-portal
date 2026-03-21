import { apiClient } from "./httpClient";

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
  const res = await apiClient.getList<CalendarEvent>("/calendar/events");
  return res.items;
};

export const createLocalEvent = (event: Partial<CalendarEvent>) =>
  apiClient.post<CalendarEvent>("/calendar/events", event);

export const updateLocalEvent = (id: string, event: Partial<CalendarEvent>) =>
  apiClient.patch<CalendarEvent>(`/calendar/events/${id}`, event);

export const deleteLocalEvent = (id: string) => apiClient.delete<void>(`/calendar/events/${id}`);
