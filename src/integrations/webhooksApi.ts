// BF_PORTAL_v875_WEBHOOKS (ported from KS-Portal webhooks/*) - outgoing webhooks (BF-Server /api/webhook-endpoints,
// Admins). Every call follows the topbar silo (the api client sends X-Silo): each silo has its own endpoints.
import { api } from "@/api";

export type EventDoc = { type: string; label: string; object: string; description: string; example: Record<string, unknown> };
export type EventsInfo = {
  silo: string;
  events: EventDoc[];
  signing: { signature_header: string; timestamp_header: string; tolerance_seconds: number; algorithm: string };
  retry: { max_attempts: number; first_retry_seconds: number; max_delay_hours: number; disable_after_dead: number; timeout_seconds: number; keep_days: number };
  limits: { endpoints: number; batch_size_max: number };
};
export type Endpoint = {
  id: string; silo: string; url: string; description: string | null; events: string[]; batch_size: number;
  status: "active" | "paused" | "disabled"; consecutive_failures: number; disabled_at: string | null; disabled_reason: string | null;
  last_success_at: string | null; last_failure_at: string | null; created_at: string; delivered_30d?: number; failed_30d?: number; queued?: number;
};
export type Delivery = {
  id: string; event_id: string; endpoint_id: string; event_type: string; object_type: string | null; object_id: string | null;
  status: "pending" | "sending" | "succeeded" | "dead" | "skipped"; attempts: number; next_attempt_at: string | null;
  last_attempt_at: string | null; last_status_code: number | null; last_error: string | null; last_duration_ms: number | null;
  delivered_at: string | null; resend_of: string | null; created_at: string;
};

const BASE = "/api/webhook-endpoints";
export const getEventsInfo = () => api.get<EventsInfo>(`${BASE}/events`);
export const listEndpoints = async () => (await api.get<{ endpoints: Endpoint[] }>(BASE)).endpoints ?? [];
export const createEndpoint = (body: { url: string; events: string[]; description?: string; batch_size?: number }) =>
  api.post<{ endpoint: Endpoint; secret: string }>(BASE, body);
export const updateEndpoint = async (id: string, body: Partial<{ url: string; events: string[]; description: string; batch_size: number; status: "active" | "paused" }>) =>
  (await api.patch<{ endpoint: Endpoint }>(`${BASE}/${id}`, body)).endpoint;
export const rotateSecret = async (id: string) => (await api.post<{ secret: string }>(`${BASE}/${id}/rotate-secret`)).secret;
export const deleteEndpoint = (id: string) => api.delete(`${BASE}/${id}`);
export const sendTest = (id: string, event?: string) => api.post<{ delivery_id: string }>(`${BASE}/${id}/test`, event ? { event } : {});
export const listDeliveries = async (id: string, status = "") =>
  (await api.get<{ deliveries: Delivery[] }>(`${BASE}/${id}/deliveries`, { params: status ? { status } : undefined })).deliveries ?? [];
export const resendDelivery = (deliveryId: string) => api.post<{ delivery_id: string }>(`${BASE}/deliveries/${deliveryId}/resend`);

export const STATUS_LABEL: Record<Delivery["status"], string> = {
  pending: "Waiting to send", sending: "Sending", succeeded: "Delivered", dead: "Failed", skipped: "Not sent",
};
