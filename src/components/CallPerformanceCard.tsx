import { useEffect, useState } from "react";

type CallStats = {
  totalCalls: number;
  answered: number;
  missed: number;
};

export default function CallPerformanceCard() {
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    answered: 0,
    missed: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calls/stats");
        if (!res.ok) return;

        const data: CallStats = await res.json();

        setStats({
          totalCalls: data.totalCalls ?? 0,
          answered: data.answered ?? 0,
          missed: data.missed ?? 0,
        });
      } catch {
        // fail silently for now
      }
    }

    load();
  }, []);

  return (
    <div className="card">
      <h3>Call Performance</h3>
      <p>Total: {stats.totalCalls}</p>
      <p>Answered: {stats.answered}</p>
      <p>Missed: {stats.missed}</p>
    </div>
  );
}
