import { useEffect, useMemo, useState } from "react";
import { AnalyticsService } from "@/services/analyticsService";
import { VisitorActivity } from "@/features/analytics/VisitorActivity";

type ReadinessPayload = {
  score?: number;
  lenderNetworkCount?: number;
};

type AnalyticsView = "overview" | "visitor-tracking";

export default function AnalyticsDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<ReadinessPayload>({});
  const [view, setView] = useState<AnalyticsView>("overview");

  useEffect(() => {
    async function load() {
      const [eventsRes, readinessRes] = await Promise.all([
        AnalyticsService.getEvents(),
        AnalyticsService.getReadiness()
      ]);

      setEvents(Array.isArray(eventsRes) ? eventsRes : []);
      setReadiness((readinessRes && typeof readinessRes === "object" ? readinessRes : {}) as ReadinessPayload);
    }

    void load();
  }, []);

  const lenderNetworkCount = useMemo(() => {
    if (typeof readiness.lenderNetworkCount === "number") {
      return readiness.lenderNetworkCount;
    }

    return events.reduce((acc, event) => {
      const count = Number(event?.metadata?.lenderNetworkCount);
      return Number.isFinite(count) ? Math.max(acc, count) : acc;
    }, 0);
  }, [events, readiness.lenderNetworkCount]);

  return (
    <div className="space-y-4 p-6">
      <h1 className="mb-4 text-2xl font-bold">Website Analytics</h1>
      <div className="flex gap-2">
        <button onClick={() => setView("overview")}>Overview</button>
        <button onClick={() => setView("visitor-tracking")}>Visitor Tracking</button>
      </div>

      {view === "visitor-tracking" ? (
        <VisitorActivity />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded border p-4">
              <p className="text-sm text-gray-500">Readiness Score</p>
              <p className="text-3xl font-semibold">{readiness.score ?? "—"}</p>
            </div>
            <div className="rounded border p-4">
              <p className="text-sm text-gray-500">Lender Network Count</p>
              <p className="text-3xl font-semibold">{lenderNetworkCount}</p>
            </div>
          </div>

          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Event</th>
                <th className="border p-2">Metadata</th>
                <th className="border p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="border p-2">{event.event}</td>
                  <td className="border p-2 text-xs">{JSON.stringify(event.metadata)}</td>
                  <td className="border p-2">{event.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
