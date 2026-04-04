import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api";

type CallStats = {
  totalCalls: number;
  answered: number;
  missed: number;
  avgDuration: number;
};

export default function CallPerformanceCard() {
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    answered: 0,
    missed: 0,
    avgDuration: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await apiCall("/api/metrics");

        setStats({
          totalCalls: data.totalCalls || 0,
          answered: data.answered || 0,
          missed: data.missed || 0,
          avgDuration: data.avgDuration || 0,
        });
      } catch (err) {
        console.error(err);
        setStats({
          totalCalls: 0,
          answered: 0,
          missed: 0,
          avgDuration: 0,
        });
      }
    }

    load();
  }, []);

  return (
    <div>
      <h3>Call Performance</h3>
      <div>Total: {stats.totalCalls}</div>
      <div>Answered: {stats.answered}</div>
      <div>Missed: {stats.missed}</div>
      <div>Avg Duration: {stats.avgDuration}</div>
    </div>
  );
}
