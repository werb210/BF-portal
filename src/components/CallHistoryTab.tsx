import { useEffect, useState } from "react";
import { fetchCallHistory, type CallSession } from "../services/callService";
import { logError } from "@/lib/logger";

export default function CallHistoryTab({ clientId }: { clientId: string }) {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!clientId) return <div>Client not selected.</div>;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCallHistory(clientId);
        if (mounted) setCalls(data);
      } catch (err) {
        logError(err, { path: "/api/call-history", clientId });
        if (mounted) setError("Unable to load call history");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [clientId]);

  if (loading) return <div>Loading call history…</div>;
  if (error) return <div>{error}</div>;
  if (!calls.length) return <div>No call history found.</div>;

  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <div key={call.id} className="border rounded p-4">
          <div className="flex justify-between">
            <span className="font-semibold">{call.status}</span>
            <span>{call.started_at ? new Date(call.started_at).toLocaleString() : "Unknown"}</span>
          </div>

          {call.duration_seconds != null && (
            <div className="text-sm text-gray-500 mt-2">Duration: {call.duration_seconds}s</div>
          )}

          {call.voicemail_url && (
            <div className="mt-2">
              <audio controls preload="none">
                <source src={call.voicemail_url} />
              </audio>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
