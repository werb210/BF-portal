import { useEffect, useMemo, useState } from "react";
import { fetchCallHistory } from "@/api/dialer";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserRole } from "@/utils/roles";

type DateFilter = 7 | 30 | 90;

type CallHistoryRecord = {
  id: string;
  created_at?: string;
  started_at?: string;
  direction?: "inbound" | "outbound" | string;
  staff_name?: string;
  duration_seconds?: number;
  outcome?: "completed" | "no-answer" | "failed" | string;
  voicemail_url?: string | null;
  recording_url?: string | null;
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
};

const CallHistoryTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [data, setData] = useState<CallHistoryRecord[]>([]);
  const [now] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const { user } = useAuth();
  const role = resolveUserRole((user as { role?: string | null } | null)?.role ?? null);
  const canPlayVoicemail = role === "Admin" || role === "Staff";

  useEffect(() => {
    let mounted = true;
    if (!applicationId) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(false);
    fetchCallHistory(applicationId)
      .then((response) => {
        if (!mounted) return;
        const payload = response?.data;
        setData(Array.isArray(payload) ? (payload as CallHistoryRecord[]) : []);
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applicationId]);

  const calls = useMemo(() => {
    const cutoff = now - dateFilter * 24 * 60 * 60 * 1000;

    return [...data]
      .filter((item) => {
        const rawDate = item.created_at ?? item.started_at;
        if (!rawDate) return false;
        const time = new Date(rawDate).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? a.started_at ?? "").getTime();
        const bTime = new Date(b.created_at ?? b.started_at ?? "").getTime();
        return bTime - aTime;
      });
  }, [data, dateFilter, now]);

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view calls.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading call history…</div>;
  if (error) return <div className="drawer-placeholder">Unable to load call history.</div>;

  return (
    <div className="drawer-tab">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Call timeline</h3>
        <label className="text-sm text-slate-600">
          Date range{" "}
          <select value={dateFilter} onChange={(event) => setDateFilter(Number(event.target.value) as DateFilter)}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {calls.length === 0 ? (
        <div className="drawer-placeholder">No call logs found for this range.</div>
      ) : (
        <div className="space-y-2" data-testid="call-history-list">
          {calls.map((call) => {
            const callDate = call.created_at ?? call.started_at ?? "";
            const direction = call.direction === "outbound" ? "outbound" : "inbound";
            const outcome = call.outcome ?? "—";
            const hasVoicemail = Boolean(call.voicemail_url);
            const recordingUrl = call.recording_url;

            return (
              <div key={call.id} className="rounded border border-slate-200 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <strong>{new Date(callDate).toLocaleString()}</strong>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{direction}</span>
                </div>
                <div>Staff: {call.staff_name ?? "—"}</div>
                <div>Duration: {formatDuration(call.duration_seconds)}</div>
                <div>Outcome: {outcome}</div>
                <div>Voicemail: {hasVoicemail ? "Yes" : "No"}</div>
                {recordingUrl ? (
                  <div className="mt-1">
                    <a href={recordingUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                      Play recording
                    </a>
                  </div>
                ) : null}
                {hasVoicemail && canPlayVoicemail ? <audio controls src={call.voicemail_url ?? undefined} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CallHistoryTab;
