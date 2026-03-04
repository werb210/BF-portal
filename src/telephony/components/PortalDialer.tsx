import { FormEvent, useMemo, useState } from "react";
import {
  hangupPortalCall,
  muteCall,
  startPortalCall,
  unmuteCall
} from "@/telephony/bootstrapVoice";
import { useCallState } from "@/telephony/state/callState";
import { useAuth } from "@/hooks/useAuth";
import { roleIn } from "@/auth/roles";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return `+${digits}`;
}

export default function PortalDialer() {
  const { role } = useAuth();
  const [phone, setPhone] = useState("");
  const [muted, setMuted] = useState(false);
  const { callStatus, errorMessage, activeCall, setErrorMessage } = useCallState();

  const isActive = callStatus === "connecting" || callStatus === "ringing" || callStatus === "in_call";

  if (!roleIn(role, ["Admin", "Staff"])) {
    return null;
  }
  const statusLabel = useMemo(() => {
    switch (callStatus) {
      case "connecting":
        return "Connecting";
      case "ringing":
        return "Ringing";
      case "in_call":
        return "In Call";
      case "ended":
        return "Ended";
      case "failed":
        return "Failed";
      default:
        return "Idle";
    }
  }, [callStatus]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);

    if (!normalized) {
      setErrorMessage("Enter a valid phone number.");
      return;
    }

    try {
      setMuted(false);
      await startPortalCall(normalized);
    } catch {
      // user-facing error is set in call state
    }
  };

  const toggleMute = () => {
    if (!activeCall) {
      return;
    }

    if (muted) {
      unmuteCall();
      setMuted(false);
      return;
    }

    muteCall();
    setMuted(true);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
    >
      <label className="text-xs font-semibold text-slate-500" htmlFor="portal-call-input">
        Client phone
      </label>
      <input
        id="portal-call-input"
        value={phone}
        onChange={event => setPhone(event.target.value)}
        placeholder="+15551234567"
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isActive}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Call
      </button>

      <div className="text-xs text-slate-600">Status: {statusLabel}</div>

      {isActive ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={hangupPortalCall}
            className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Hang up
          </button>
        </div>
      ) : null}

      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </form>
  );
}
