import { Call, Device } from "@twilio/voice-sdk";
import { setCallStatus } from "@/dialer/callStore";

let device: Device | null = null;
let activeCall: Call | null = null;
let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let registrationInProgress = false;
let heartbeatInterval: number | null = null;
let onlineRecoveryBound = false;

const handleOnlineRecovery = () => {
  if (!device) {
    void initVoice();
  }
};

export async function initVoice(_userId?: string): Promise<void> {
  if (device || registrationInProgress) return;

  registrationInProgress = true;

  try {
    const res = await fetch("/api/voice/token", {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      registrationInProgress = false;
      return;
    }

    const { token } = (await res.json()) as { token?: string };
    if (!token) {
      registrationInProgress = false;
      return;
    }

    device = new Device(token, { logLevel: 1 });

    device.on("registered", () => {
      registrationInProgress = false;
    });

    device.on("incoming", (call: Call) => {
      if (activeCall) {
        call.reject();
        return;
      }

      activeCall = call;
      setCallStatus("incoming");
      call.on("disconnect", () => {
        if (activeCall === call) {
          activeCall = null;
          setCallStatus("ended");
        }
      });

      window.dispatchEvent(new CustomEvent("incoming-call", { detail: call }));
    });

    device.on("error", () => {
      registrationInProgress = false;
    });

    device.register();
    scheduleTokenRefresh();
    startPresenceHeartbeat();

    if (!onlineRecoveryBound) {
      window.addEventListener("online", handleOnlineRecovery);
      onlineRecoveryBound = true;
    }
  } catch {
    registrationInProgress = false;
  }
}

function scheduleTokenRefresh() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
  }

  tokenRefreshTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/voice/token", {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok || !device) return;

      const { token } = (await res.json()) as { token?: string };
      if (!token) return;

      device.updateToken(token);
      scheduleTokenRefresh();
    } catch {
      // No-op: we'll retry on next refresh window.
    }
  }, 50 * 60 * 1000);
}

function startPresenceHeartbeat() {
  if (heartbeatInterval) {
    window.clearInterval(heartbeatInterval);
  }

  heartbeatInterval = window.setInterval(() => {
    if (!device) return;

    void fetch("/api/voice/presence", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: activeCall ? "busy" : "online",
        source: "portal"
      })
    });
  }, 15000);
}

export async function startOutboundCall(clientId: string) {
  if (!device || activeCall) return;

  setCallStatus("connecting");
  activeCall = await device.connect({
    params: { clientId }
  });

  activeCall.on("ringing", () => setCallStatus("ringing"));
  activeCall.on("accept", () => setCallStatus("connected"));
  activeCall.on("disconnect", () => {
    activeCall = null;
    setCallStatus("ended");
  });
}

export async function acceptIncoming(call: Call): Promise<boolean> {
  if (activeCall && activeCall !== call) return false;

  const callSid = call.parameters?.CallSid ?? call.parameters?.call_sid;

  if (callSid) {
    try {
      const lockResponse = await fetch(`/api/call/lock/${encodeURIComponent(String(callSid))}`, {
        credentials: "include"
      });

      if (!lockResponse.ok) {
        return false;
      }

      const lock = (await lockResponse.json()) as { locked?: boolean; lockedByAnotherStaff?: boolean };
      if (lock.lockedByAnotherStaff || lock.locked === true) {
        return false;
      }
    } catch {
      return false;
    }
  }

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
  registrationInProgress = false;

  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }

  if (heartbeatInterval) {
    window.clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }

  if (device) {
    device.destroy();
    device = null;
  }

  if (onlineRecoveryBound) {
    window.removeEventListener("online", handleOnlineRecovery);
    onlineRecoveryBound = false;
  }

  setCallStatus("idle");
}
