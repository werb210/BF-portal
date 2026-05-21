import { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "./getVoiceToken";
import { api } from "@/api";
import { useCallState } from "./state/callState";

let device: Device | null = null;
let bootstrapPromise: Promise<Device> | null = null;
let activeCall: Call | null = null;
let deviceInitialized = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const activeStatuses = new Set(["connecting", "ringing", "in_call"]);

const clearActiveCall = (call?: Call) => {
  if (!call || activeCall === call) {
    activeCall = null;
  }
};

const onCallDisconnected = (call?: Call) => {
  clearActiveCall(call);
  useCallState.getState().endCall();
};

const setFailure = (message: string) => {
  clearActiveCall();
  useCallState.getState().setCallFailed(message);
};

const bindCallHandlers = (call: Call) => {
  call.on("ringing", () => {
    useCallState.getState().setCallRinging();
  });

  call.on("accept", () => {
    activeCall = call;
    useCallState.getState().setCallInProgress(call);
  });

  call.on("disconnect", () => {
    onCallDisconnected(call);
  });

  call.on("cancel", () => {
    onCallDisconnected(call);
  });

  call.on("reject", () => {
    onCallDisconnected(call);
  });

  call.on("error", (error: Error) => {
    const message = error.message || "Call failed.";
    setFailure(message);
  });
};


// BF_PORTAL_BLOCK_v211_DIALER_PRESENCE_HEARTBEAT_v1
// Server filters routable staff with `last_heartbeat > now() - 5 minutes`,
// so a 30s tick gives ~10x headroom against network blips. Fire-and-forget;
// failures are non-fatal (next tick retries).
function startPresenceHeartbeat() {
  if (heartbeatTimer) return;
  const tick = () => {
    void api.post("/api/telephony/presence/heartbeat").catch(() => {});
  };
  tick(); // fire immediately so the row's heartbeat refreshes within seconds of register
  heartbeatTimer = setInterval(tick, 30_000);
}

function stopPresenceHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function initializeDevice() {
  if (deviceInitialized) {
    if (device) return device;
    if (bootstrapPromise) return bootstrapPromise;
  }
  deviceInitialized = true;
  const token = await getVoiceToken();
  const nextDevice = new Device(token);

  nextDevice.on("incoming", (call: Call) => {
    const state = useCallState.getState();

    if (activeStatuses.has(state.callStatus)) {
      call.reject();
      return;
    }

    state.receiveIncomingCall(call);
    bindCallHandlers(call);
  });

  nextDevice.on("error", (error: Error) => {
    setFailure(error.message || "Voice device error.");
  });

  nextDevice.on("cancel", () => {
    onCallDisconnected();
  });

  nextDevice.on("unregistered", () => {
    stopPresenceHeartbeat(); // BF_PORTAL_BLOCK_v211_DIALER_PRESENCE_HEARTBEAT_v1
    onCallDisconnected();
    setFailure("Voice device disconnected. Please try again.");
    device = null;
    bootstrapPromise = null;
    deviceInitialized = false;
  });

  // BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE3_v1
  // Twilio Voice SDK fires tokenWillExpire roughly 5 minutes before
  // the access token's ~60-minute TTL. Without a handler, in-progress
  // calls hit AccessTokenExpired (error 20104) at the 60-minute mark
  // and the device unregisters. Pre-Block 4 this lived inside
  // DialerPanel.initDevice (the now-removed local Device); the
  // responsibility moved up to the singleton owner. Re-fetches via
  // the same getVoiceToken() helper used at boot, then hands the
  // fresh token to the live Device with updateToken -- the SDK swaps
  // it transparently without interrupting an active call.
  nextDevice.on("tokenWillExpire", async () => {
    try {
      const fresh = await getVoiceToken();
      if (fresh) {
        await nextDevice.updateToken(fresh);
      }
    } catch {
      // Non-fatal here; if the current token does expire before the
      // next attempt, the SDK will fire "unregistered" and the
      // handler above surfaces the standard "Voice device
      // disconnected" message, which prompts the user to retry.
    }
  });

  await nextDevice.register();
  device = nextDevice;
  startPresenceHeartbeat(); // BF_PORTAL_BLOCK_v211_DIALER_PRESENCE_HEARTBEAT_v1
  return nextDevice;
}

export async function bootstrapVoice() {
  if (device) {
    return device;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = initializeDevice()
      .catch(error => {
        const message = error instanceof Error ? error.message : "Unable to initialize voice calling.";
        setFailure(message);
        device = null;
        deviceInitialized = false;
        throw error;
      })
      .finally(() => {
        if (!device) {
          bootstrapPromise = null;
        }
      });
  }

  return bootstrapPromise;
}

// BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE2_v1
// BF_PORTAL_BLOCK_BI_ROUND5_7BIS_v1 -- opts.silo added so Voice SDK
// outbound calls can be tagged for the silo timeline. Block 9 picks
// it up in /api/webhooks/twilio/voice/twiml on BF-Server to create
// the call_logs row with the right silo. Silo is normalized to
// upper-case (BF / BI / SLF) before going into the Twilio params --
// the server-side resolveSiloFromRequest helper does the same.
export async function startPortalCall(
  to: string,
  opts?: { applicationId?: string; silo?: string },
): Promise<Call> {
  const voiceDevice = device ?? (await bootstrapVoice());
  // BF_PORTAL_BLOCK_v214_DIALER_E164_NANPA_FIX_v1
  // Previous code did `+${digits}` which turns 10-digit NANPA numbers
  // like "5878881837" into "+5878881837" -- an invalid E.164 number
  // (country code 5 = Brazil-ish). Twilio rejects the SDK connect
  // params and disconnects within ~27ms with no error surfaced to the
  // UI. Mirror bfNormalizeToE164 in DialerPanel.tsx exactly so the
  // REST path and the SDK path agree on how to format numbers.
  const raw = (to ?? "").trim();
  let normalizedTo = "";
  if (/^\+\d{8,15}$/.test(raw)) {
    normalizedTo = raw;
  } else {
    const digits = raw.replace(/\D+/g, "");
    if (digits.length === 11 && digits.startsWith("1")) normalizedTo = `+${digits}`;
    else if (digits.length === 10) normalizedTo = `+1${digits}`;
    else if (digits.length >= 8 && digits.length <= 15) normalizedTo = `+${digits}`;
  }

  if (!normalizedTo) {
    throw new Error("Enter a valid phone number.");
  }
  const state = useCallState.getState();

  if (activeStatuses.has(state.callStatus)) {
    throw new Error("A call is already in progress.");
  }

  state.startOutgoingCall(normalizedTo);

  try {
    const params: Record<string, string> = { To: normalizedTo };
    if (opts?.applicationId) {
      params.applicationId = opts.applicationId;
    }
    if (opts?.silo) {
      params.silo = String(opts.silo).toUpperCase();
    }
    const call = await voiceDevice.connect({ params });

    activeCall = call;
    useCallState.getState().setCallInProgress(call);
    bindCallHandlers(call);
    return call;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start call.";
    setFailure(message);
    throw error;
  }
}

export function answerIncomingCall() {
  const { incomingCall } = useCallState.getState();

  if (!incomingCall) {
    return;
  }

  incomingCall.accept();
  activeCall = incomingCall;
  useCallState.getState().acceptIncomingCall(incomingCall);
}

export function declineIncomingCall() {
  const { incomingCall } = useCallState.getState();

  if (!incomingCall) {
    useCallState.getState().declineIncomingCall();
    return;
  }

  incomingCall.reject();
  clearActiveCall(incomingCall);
  useCallState.getState().declineIncomingCall();
}

export function hangupPortalCall() {
  const currentCall = activeCall;

  if (!currentCall) {
    useCallState.getState().endCall();
    return;
  }

  currentCall.disconnect();
  onCallDisconnected(currentCall);
}

export function muteCall() {
  activeCall?.mute(true);
}

export function unmuteCall() {
  activeCall?.mute(false);
}


export async function destroyVoiceDevice() {
  if (activeCall) {
    activeCall.disconnect();
  }
  activeCall = null;
  if (device) {
    device.destroy();
  }
  device = null;
  bootstrapPromise = null;
  deviceInitialized = false;
}

// BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE1_v1
// Sync getter so legacy callers (voiceService.getDevice) can return
// the shared singleton without going async. Use sparingly; new code
// should await bootstrapVoice() instead so it survives a cold mount.
export function getVoiceDevice() {
  return device;
}


// BF_PORTAL_BLOCK_v211_DIALER_PRESENCE_HEARTBEAT_v1
// Stop the heartbeat on tab close so the server presence row ages out
// and routing immediately falls to other available staff (instead of
// ringing this dead browser for ~5 more minutes).
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    stopPresenceHeartbeat();
  });
}
