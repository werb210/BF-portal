import { api } from "@/api";
import { getMicrosoftAccessToken } from "@/auth/microsoftToken";
import { msalClient } from "@/auth/msal";
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
  const msToken = await getMicrosoftAccessToken(msalClient);
  const res = await api.getList<CalendarEvent>("/api/calendar/events", {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
  return res;
};

export const createLocalEvent = async (event: Partial<CalendarEvent>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.post<CalendarEvent>("/api/calendar/events", event, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};

export const updateLocalEvent = async (id: string, event: Partial<CalendarEvent>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.patch<CalendarEvent>(`/api/calendar/events/${id}`, event, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};

export const deleteLocalEvent = async (id: string) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.delete<void>(`/api/calendar/events/${id}`, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};
