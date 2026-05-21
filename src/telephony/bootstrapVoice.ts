// BF_PORTAL_BLOCK_v224_DIALER_RIP_OUT_v1
// In-portal Twilio Voice SDK dialer is disabled. Exports remain so
// orphaned consumers (DialerPanel, PortalDialer, IncomingCallOverlay,
// voiceService, etc.) still compile while being tree-shaken out of the
// rendered bundle. All entry points are no-ops or reject; nothing here
// touches @twilio/voice-sdk anymore.

import type { Call, Device } from "@twilio/voice-sdk";

const DISABLED = "In-portal dialer is disabled (v224 rip-out). Use the tel: link to place calls.";

export async function bootstrapVoice(): Promise<Device> {
  throw new Error(DISABLED);
}

export async function startPortalCall(
  _to: string,
  _opts?: { applicationId?: string; silo?: string },
): Promise<Call> {
  throw new Error(DISABLED);
}

export function answerIncomingCall(): void { /* no-op */ }
export function declineIncomingCall(): void { /* no-op */ }
export function hangupPortalCall(): void { /* no-op */ }
export function muteCall(): void { /* no-op */ }
export function unmuteCall(): void { /* no-op */ }
export async function destroyVoiceDevice(): Promise<void> { /* no-op */ }
export function getVoiceDevice(): Device | null { return null; }
