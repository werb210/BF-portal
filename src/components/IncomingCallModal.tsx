import { useEffect, useState } from "react";
import type { Call } from "@twilio/voice-sdk";
import { acceptIncoming, rejectIncoming } from "@/services/voiceService";

export default function IncomingCallModal() {
  const [call, setCall] = useState<Call | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<Call>;
      setCall(customEvent.detail);
    };

    window.addEventListener("incoming-call", handler as EventListener);
    return () => window.removeEventListener("incoming-call", handler as EventListener);
  }, []);

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="rounded bg-white p-6 text-center shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Incoming Call</h2>
        <div className="flex justify-center gap-4">
          <button
            className="rounded bg-green-600 px-4 py-2 text-white"
            onClick={async () => {
              const accepted = await acceptIncoming(call);
              if (accepted) {
                setCall(null);
              }
            }}
          >
            Accept
          </button>
          <button
            className="rounded bg-red-600 px-4 py-2 text-white"
            onClick={() => {
              rejectIncoming(call);
              setCall(null);
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
