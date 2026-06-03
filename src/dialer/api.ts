// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import { api } from "@/api";
export type StartCallRequest = { to?: string; staffIdentity?: string; applicationId?: string | null; contactId?: string | null; contactName?: string | null; silo?: string; };
export type StartCallResponse = { ok: boolean; conferenceId: string; conferenceFriendly: string; callerParticipantId: string; calleeParticipantId: string; calleeCallSid: string; };
// BF_PORTAL_BLOCK_v311_QUICK_CALL_v1
export type QuickCallStaff = { userId: string; name: string; identity: string | null; avatarUrl: string | null; online: boolean };
export type QuickCallData = { staff: QuickCallStaff[]; slots: string[] };
export const dialerApi = {
  startCall: (b: StartCallRequest) => api.post<StartCallResponse>("/api/voice/calls", b), getConference: (id: string) => api.get<any>(`/api/voice/conferences/${id}`), voiceToken: () => api.get<any>("/api/telephony/token"),
  quickCallGet: () => api.get<QuickCallData>("/api/telephony/quick-call"),
  quickCallSave: (slots: string[]) => api.put<{ ok: boolean; slots: string[] }>("/api/telephony/quick-call", { slots }),
  muteParticipant: (cid: string, pid: string, muted: boolean) => api.post<any>(`/api/voice/conferences/${cid}/participants/${pid}/mute`, { muted }),
  holdParticipant: (cid: string, pid: string, hold: boolean) => api.post<any>(`/api/voice/conferences/${cid}/participants/${pid}/hold`, { hold }),
  kickParticipant: (cid: string, pid: string) => api.delete<any>(`/api/voice/conferences/${cid}/participants/${pid}`),
  addParticipant: (cid: string, body: { phone?: string; identity?: string; name?: string }) => api.post<any>(`/api/voice/conferences/${cid}/participants`, body),
  dtmf: (callSid: string, digits: string) => api.post<any>(`/api/voice/calls/${callSid}/dtmf`, { digits }),
  recording: (cid: string, op: "pause" | "resume" | "stop") => api.post<any>(`/api/voice/conferences/${cid}/recording`, { op }),
  transfer: (cid: string, body: { mode: "cold" | "warm"; target: { phone?: string; identity?: string; name?: string }; initiatorParticipantId?: string }) => api.post<any>(`/api/voice/conferences/${cid}/transfer`, body),
};
