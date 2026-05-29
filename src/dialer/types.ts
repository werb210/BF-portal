// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import type { Call, Device } from "@twilio/voice-sdk";

export type DialerStatus =
  | "idle" | "ready" | "preflight"
  | "dialing" | "ringing" | "connected"
  | "incoming" | "ending" | "error";

export type Participant = {
  id: string;
  conference_id: string;
  twilio_call_sid: string | null;
  twilio_participant_label: string | null;
  identity: string | null;
  phone_number: string | null;
  display_name: string | null;
  kind: "staff" | "pstn" | "client_miniportal";
  role: "moderator" | "participant";
  status: "invited" | "ringing" | "joined" | "left" | "failed" | "canceled";
  muted: boolean;
  on_hold: boolean;
  joined_at: string | null;
  left_at: string | null;
};

export type Conference = {
  id: string;
  twilio_conference_sid: string | null;
  friendly_name: string;
  status: string;
  silo: string;
  direction: "outbound" | "inbound" | "internal" | "client_miniportal";
  created_by_user_id: string | null;
  application_id: string | null;
  contact_id: string | null;
  recording_sid: string | null;
  recording_url: string | null;
  recording_paused: boolean;
  started_at: string;
  ended_at: string | null;
};

export type TranscriptSegment = {
  pid: string;
  text: string;
  final: boolean;
  ts: string;
};

export type DialerCtx = {
  applicationId?: string | null;
  applicationName?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  source?: string | null;
};

export type DialerState = {
  status: DialerStatus;
  error: string | null;
  device: Device | null;
  call: Call | null;
  conference: Conference | null;
  participants: Participant[];
  transcript: TranscriptSegment[];
  incoming: { conferenceFriendly: string; fromDisplay: string; pendingCall?: any } | null;
  isOpen: boolean;
  isMinimized: boolean;
  ctx: DialerCtx;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  micPermission: "granted" | "denied" | "prompt" | "unknown";
  callStartedAt: string | null;
};
