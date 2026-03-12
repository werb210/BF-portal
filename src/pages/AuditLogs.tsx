import { useEffect, useMemo, useState } from "react";
import { createApi } from "../api/apiFactory";
import { useAuth } from "../auth/AuthContext";
import Skeleton from "../components/Skeleton";

type AuditLogEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  source: "BI" | "SLF";
};

const PAGE_SIZE = 10;

export default function AuditLogs() {
  const { token } = useAuth();
  const biApi = useMemo(() => createApi("bi", token ?? ""), [token]);
  const slfApi = useMemo(() => createApi("slf", token ?? ""), [token]);
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadLogs() {
      const [biEvents, slfLogs] = await Promise.all([
        biApi.get<Omit<AuditLogEvent, "source">[]>("/bi/admin/events"),
        slfApi.get<Omit<AuditLogEvent, "source">[]>("/slf/logs")
      ]);
      setEvents([
        ...biEvents.data.map((event) => ({ ...event, source: "BI" as const })),
        ...slfLogs.data.map((event) => ({ ...event, source: "SLF" as const }))
      ]);
      setIsLoading(false);
    }

    void loadLogs();
  }, [biApi, slfApi]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paginatedRows = events.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <h2>Audit Logs</h2>
      {isLoading ? <Skeleton count={8} height={24} /> : null}
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>ID</th>
            <th>Type</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((event, index) => {
            const eventId = event.id ?? `${page}-${index}`;
            const type = typeof event.type === "string" ? event.type : "event";
            const createdAt = typeof event.created_at === "string" ? event.created_at : "-";

            return (
              <tr key={eventId}>
                <td>{event.source}</td>
                <td>{eventId}</td>
                <td>{type}</td>
                <td>{createdAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
