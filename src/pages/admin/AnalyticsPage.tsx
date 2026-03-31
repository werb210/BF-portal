import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/apiClient";

type AnalyticsEvent = {
  event_name?: string;
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    const cacheKey = "portal:analytics:events";
    const cachedEvents = sessionStorage.getItem(cacheKey);
    if (cachedEvents) {
      try {
        const parsed = JSON.parse(cachedEvents);
        setEvents(Array.isArray(parsed) ? parsed : []);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    apiRequest<AnalyticsEvent[]>("/analytics")
      .then((data) => {
        const nextEvents = Array.isArray(data) ? data : [];
        setEvents(nextEvents);
        sessionStorage.setItem(cacheKey, JSON.stringify(nextEvents));
      })
      .catch(() => setEvents([]));
  }, []);

  if (user?.role !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="page space-y-4">
      <h1 className="text-xl font-semibold">Website Analytics Events</h1>
      <ul className="list-disc space-y-1 pl-5">
        {events.map((event, i) => (
          <li key={`${event.event_name ?? "event"}-${i}`}>{event.event_name}</li>
        ))}
      </ul>
    </div>
  );
}
