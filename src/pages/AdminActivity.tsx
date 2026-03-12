import { useEffect, useMemo, useState } from "react";
import { createApi } from "../api/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";

type ActivityEvent = {
  id?: string;
  type?: string;
  message?: string;
  created_at?: string;
  timestamp?: string;
  source: "BI" | "SLF";
};

export default function AdminActivity() {
  const { token } = useAuth();
  const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
  const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    async function loadActivity() {
      const [biEvents, slfLogs] = await Promise.all([
        biApi.get<Omit<ActivityEvent, "source">[]>("/bi/admin/events"),
        slfApi.get<Omit<ActivityEvent, "source">[]>("/slf/logs")
      ]);

      const merged = [
        ...biEvents.data.map((event) => ({ ...event, source: "BI" as const })),
        ...slfLogs.data.map((event) => ({ ...event, source: "SLF" as const }))
      ].sort((a, b) => {
        const aTime = new Date(a.timestamp ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.timestamp ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });

      setEvents(merged);
    }

    void loadActivity();
  }, [biApi, slfApi]);

  return (
    <div>
      <h2>Global Activity Feed</h2>
      {!events ? (
        <Skeleton count={8} height={22} />
      ) : (
        <ul>
          {events.map((event, index) => {
            const key = event.id ?? `${event.source}-${index}`;
            return (
              <li key={key}>
                [{event.source}] {event.created_at ?? event.timestamp ?? "-"} — {event.type ?? "event"} {event.message ?? ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
