import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { fetchStaffCallStats } from "@/api/dialer";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserRole } from "@/utils/roles";

type DateFilter = 7 | 30 | 90;

type LeaderboardEntry = {
  staffName: string;
  totalCalls: number;
};

type CallStats = {
  totalCalls: number;
  avgDurationSeconds: number;
  missedCallPercent: number;
  voicemailCount: number;
  leaderboard?: LeaderboardEntry[];
};

const fallbackStats: CallStats = {
  totalCalls: 0,
  avgDurationSeconds: 0,
  missedCallPercent: 0,
  voicemailCount: 0,
  leaderboard: []
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0m";
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};

const CallPerformanceCard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(7);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const { user } = useAuth();
  const role = resolveUserRole((user as { role?: string | null } | null)?.role ?? null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(false);

    fetchStaffCallStats()
      .then((response) => {
        if (!mounted) return;
        const payload = response?.data;
        if (payload && typeof payload === "object") {
          setStats(payload as CallStats);
          return;
        }
        setStats(fallbackStats);
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
        setStats(fallbackStats);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dateFilter]);

  const resolvedStats = stats ?? fallbackStats;

  return (
    <Card title="Call Performance">
      <div className="mb-2 text-sm text-slate-600">
        Date range{" "}
        <select value={dateFilter} onChange={(event) => setDateFilter(Number(event.target.value) as DateFilter)}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {isLoading ? <p>Loading call metrics…</p> : null}
      {error ? <p>Unable to load call metrics.</p> : null}
      {!isLoading && !error ? (
        <>
          <p>Total Calls ({dateFilter} days): {resolvedStats.totalCalls ?? 0}</p>
          <p>Avg Duration: {formatDuration(resolvedStats.avgDurationSeconds ?? 0)}</p>
          <p>Missed Call %: {Number(resolvedStats.missedCallPercent ?? 0).toFixed(1)}%</p>
          <p>Voicemail Count: {resolvedStats.voicemailCount ?? 0}</p>

          {role === "Admin" && resolvedStats.leaderboard?.length ? (
            <div className="mt-3">
              <h4 className="font-medium">Staff leaderboard</h4>
              <ul>
                {resolvedStats.leaderboard.map((entry) => (
                  <li key={entry.staffName}>
                    {entry.staffName}: {entry.totalCalls} calls
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
};

export default CallPerformanceCard;
