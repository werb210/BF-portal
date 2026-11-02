// BF_PORTAL_v871_CALL_QUEUES - BF-Server /api/call-queues (ported from KS-Portal #41).
import { api } from "@/api";

export type Overflow = "voicemail" | "callback" | "ask";
export type Queue = {
  id: string; name: string; greeting: string; hold_message: string; hold_audio_id: string | null; announce_position: boolean;
  max_wait_seconds: number; ring_seconds: number; overflow: Overflow; overflow_user_id: string | null; archived_at: string | null; member_ids: string[];
  silo: "BF" | "BI";
};
export type QueueSetup = { queues: Queue[]; main_line_queue_id: string | null; users: Array<{ id: string; name: string }>; audio: Array<{ id: string; file_name: string | null }> };
export type Live = {
  queues: Array<{
    id: string; name: string; max_wait_seconds: number;
    waiting: Array<{ id: string; position: number; from: string | null; caller_name: string | null; contact_id: string | null; wait_seconds: number; ringing: string | null }>;
    connected: Array<{ id: string; from: string | null; caller_name: string | null; agent: string | null; talk_seconds: number }>;
    today: { answered: number; abandoned: number; voicemail: number; callbacks: number; avg_wait_seconds: number; longest_wait_seconds: number };
  }>;
  agents: Array<{ user_id: string; name: string; available: boolean; signed_in: boolean; on_call: boolean; busy: boolean; queue_ids: string[]; idle_seconds: number | null }>;
  callbacks: Array<{ id: string; queue_id: string; from_number: string | null; caller_name: string | null; contact_id: string | null; requested_at: string | null }>;
};

export const callQueuesApi = {
  setup: () => api.get<QueueSetup>("/api/call-queues"),
  create: (body: unknown) => api.post<{ queue: Queue }>("/api/call-queues", body),
  update: (id: string, body: unknown) => api.put<{ queue: Queue }>(`/api/call-queues/${id}`, body),
  archive: (id: string) => api.post(`/api/call-queues/${id}/archive`, {}),
  mainLine: (queueId: string | null) => api.put("/api/call-queues/main-line", { queue_id: queueId }),
  live: () => api.get<Live>("/api/call-queues/live"),
  me: () => api.get<{ available: boolean; queues: string[] }>("/api/call-queues/me"),
  setMe: (available: boolean) => api.put<{ available: boolean }>("/api/call-queues/me", { available }),
  setAgent: (userId: string, available: boolean) => api.put(`/api/call-queues/agents/${userId}`, { available }),
  callbackDone: (id: string) => api.post(`/api/call-queues/callbacks/${id}/done`, {}),
};

export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
