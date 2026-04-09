import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { retryUnlessClientError } from "@/api/retryPolicy";

type CallStats = {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageDuration: number;
};

export default function CallPerformanceCard() {
  const { data: statsMap = {} } = useQuery<Record<string, CallStats>>({
    queryKey: ["bf", "call-stats"],
    queryFn: ({ signal }) => api.get<Record<string, CallStats>>("/api/call/stats", { signal }),
    retry: retryUnlessClientError
  });

  return (
    <div className="card">
      <h2>Call Performance</h2>

      {Object.entries(statsMap).map(([userId, stats]) => (
        <div key={userId} className="stat-row">
          <h4>{userId}</h4>
          <p>Total Calls: {stats.totalCalls}</p>
          <p>Answered: {stats.answeredCalls}</p>
          <p>Missed: {stats.missedCalls}</p>
          <p>Avg Duration: {stats.averageDuration}s</p>
        </div>
      ))}
    </div>
  );
}
