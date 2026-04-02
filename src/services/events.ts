import { api } from "@/lib/api";

export async function getEvents(params?: { view?: string }) {
  const qs = params?.view ? `?view=${encodeURIComponent(params.view)}` : "";
  return api.get(`/events${qs}`);
}
