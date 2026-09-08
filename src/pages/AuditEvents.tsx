// BF_PORTAL_AUDIT_EVENTS_v1
// audit_events records every staff and service action and had no UI. Blocks
// v334/v335 on BF-Server stamp a service principal into metadata so Maya's
// actions are separable from a person's on the same Staff role; without a
// surface that distinction existed only in the database.
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import Skeleton from "@/components/Skeleton";

type Principal = "all" | "service" | "human";

type AuditEvent = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: string;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  success: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export default function AuditEvents() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [principal, setPrincipal] = useState<Principal>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setEvents(null);
    setError(null);
    const query = principal === "all" ? "" : `?principal=${principal}`;
    const onFailure = () => {
      // A failed load must render an empty table with an explanation, never an
      // indefinite spinner -- the failure mode Block v1 fixed on AuditLogs.
      setEvents([]);
      setError("Could not load audit events.");
    };
    try {
      void apiClient.get<AuditEvent[]>(`/admin/audit/events${query}`).then(
        (rows) => setEvents(Array.isArray(rows) ? rows : []),
        onFailure,
      );
    } catch {
      onFailure();
    }
  }, [principal]);

  useEffect(() => { void load(); }, [load]);

  function actorLabel(event: AuditEvent) {
    const meta = event.metadata ?? {};
    if (meta.principal === "service") {
      return { label: String(meta.service ?? "service"), isService: true };
    }
    return { label: event.actor_user_id ?? "—", isService: false };
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>Audit Events</h2>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        Every staff and automated action recorded by the server.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {(["all", "human", "service"] as Principal[]).map((value) => (
          <button
            key={value}
            onClick={() => setPrincipal(value)}
            data-testid={`audit-filter-${value}`}
            style={{
              fontWeight: principal === value ? 600 : 400,
              textDecoration: principal === value ? "underline" : "none",
            }}
          >
            {value === "all" ? "All" : value === "human" ? "People" : "Agents"}
          </button>
        ))}
        <button onClick={() => void load()} style={{ marginLeft: "auto" }}>Refresh</button>
      </div>

      {error ? (
        <p data-testid="audit-events-error" style={{ color: "#8A2B2B" }}>{error}</p>
      ) : null}

      {!events ? (
        <Skeleton />
      ) : events.length === 0 && !error ? (
        <p style={{ color: "#64748b" }}>No events for this filter.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: 8 }}>When</th>
              <th style={{ padding: 8 }}>Actor</th>
              <th style={{ padding: 8 }}>Action</th>
              <th style={{ padding: 8 }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const actor = actorLabel(event);
              return (
                <tr key={event.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: 8 }}>
                    {actor.isService ? (
                      <span
                        data-testid="audit-service-badge"
                        style={{
                          background: "#EEF2FF", color: "#3730A3",
                          padding: "2px 6px", borderRadius: 4, fontSize: 12,
                        }}
                      >
                        {actor.label}
                      </span>
                    ) : (
                      actor.label
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{event.action}</td>
                  <td style={{ padding: 8, color: event.success ? "#166534" : "#8A2B2B" }}>
                    {event.success ? "ok" : "failed"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
