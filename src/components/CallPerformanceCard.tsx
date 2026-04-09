import React, { useEffect, useState } from "react";

type CallStats = {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageDuration: number;
};

export default function CallPerformanceCard() {
  const [statsMap, setStatsMap] = useState<Record<string, CallStats>>({});

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/call/stats");
        if (!res.ok) throw new Error("Failed to fetch call stats");
        const data: Record<string, CallStats> = await res.json();
        setStatsMap(data);
      } catch (err) {
        console.error("Call stats fetch error:", err);
      }
    };

    void loadStats();
  }, []);

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
