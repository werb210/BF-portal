import { answerIncomingCall, declineIncomingCall } from "@/telephony/bootstrapVoice";
import { useCallState } from "../state/callState";

function getCallerLabel(call: unknown): string {
  if (!call || typeof call !== "object") {
    return "Unknown caller";
  }

  const parameters = (call as { parameters?: Record<string, string> }).parameters;
  const from = parameters?.From || parameters?.Caller;
  return from || "Unknown caller";
}

export default function IncomingCallOverlay() {
  const incomingCall = useCallState(state => state.incomingCall);

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 rounded-lg bg-white p-4 shadow-lg">
      <div className="mb-1 font-semibold">Incoming Call</div>
      <div className="mb-3 text-sm text-slate-600">{getCallerLabel(incomingCall)}</div>

      <div className="flex gap-2">
        <button
          onClick={answerIncomingCall}
          className="flex-1 rounded bg-green-600 px-3 py-2 text-white"
        >
          Answer
        </button>

        <button
          onClick={declineIncomingCall}
          className="flex-1 rounded bg-red-600 px-3 py-2 text-white"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
