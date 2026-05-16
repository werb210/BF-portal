// BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE1_v1
// Phase 1 of dialer consolidation. This module no longer owns a
// Twilio Device. It delegates to bootstrapVoice so the whole portal
// shares one Device registered under the staff identity. Pre-Phase1
// the portal registered two Devices (this one plus bootstrapVoice's)
// which produced doubled inbound popups (IncomingCallModal +
// IncomingCallOverlay) and the audio-routed-to-wrong-Device "no
// sound" symptom captured in BI Issues 9.
//
// Public surface preserved so callers (MayaDialer, IncomingCallModal,
// ContactDetailsDrawer) need no edits in this phase:
//   initVoice, startOutboundCall, acceptIncoming, rejectIncoming,
//   destroyVoice, initializeVoice, getDevice, makeCall.
//
// Notes for Phase 2:
//   - destroyVoice no longer tears down the shared bootstrap device.
//     It only hangs up the active call. The bootstrap device is
//     destroyed on VoiceBootstrap unmount (App.tsx).
//   - The "incoming-call" window event is no longer fired here.
//     IncomingCallModal stays mounted but becomes inert.
//     IncomingCallOverlay (bootstrap's UI) is now the single inbound
//     surface.
import type { Call } from "@twilio/voice-sdk";
import { setCallStatus } from "@/dialer/callStore";
import { bootstrapVoice, getVoiceDevice } from "@/telephony/bootstrapVoice";

let activeCall: Call | null = null;

export async function initVoice(_userId?: string): Promise<void> {
  try {
    await bootstrapVoice();
  } catch {
    // bootstrapVoice surfaces user-facing errors via useCallState.
  }
}

export async function startOutboundCall(clientId: string) {
  if (activeCall) return;
  try {
    const device = await bootstrapVoice();
    if (!device) return;
    setCallStatus("connecting");
    activeCall = await device.connect({ params: { clientId } });
    activeCall.on("ringing", () => setCallStatus("ringing"));
    activeCall.on("accept", () => setCallStatus("connected"));
    activeCall.on("disconnect", () => {
      activeCall = null;
      setCallStatus("ended");
    });
  } catch {
    activeCall = null;
    setCallStatus("idle");
  }
}

export async function acceptIncoming(call: Call): Promise<boolean> {
  if (activeCall && activeCall !== call) return false;

  activeCall = call;
  setCallStatus("connecting");
  call.accept();
  call.on("accept", () => setCallStatus("connected"));
  call.on("disconnect", () => {
    if (activeCall === call) {
      activeCall = null;
      setCallStatus("ended");
    }
  });

  return true;
}

export function rejectIncoming(call: Call) {
  call.reject();
  if (activeCall === call) {
    activeCall = null;
  }
  setCallStatus("missed");
}

export function destroyVoice() {
  // Phase 1: hang up the active call only. The shared bootstrap
  // device is owned by VoiceBootstrap in App.tsx and is destroyed
  // there on unmount.
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
  setCallStatus("idle");
}

// Compatibility shims for the slide-in dialer surface.
export async function initializeVoice(identity: string): Promise<void> {
  await initVoice(identity);
}

export function getDevice() {
  return getVoiceDevice();
}

export async function makeCall(to: string) {
  await startOutboundCall(to);
  return activeCall;
}
