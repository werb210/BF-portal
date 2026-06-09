import { Fragment, useEffect, useState } from "react";
import { fetchTaskStatus, type TaskStatus } from "@/api/applicationTasks";

// BF_PORTAL_BLOCK_v783_TASK_STATUS — shows whether the applicant has finished the
// tasks we asked of them (Connect Bank/Flinks, CRA, Net Worth, Advisors, Debt,
// collateral, Gov ID, document upload), read from /api/applications/:id/task-status.
export default function OverviewTab({
  application,
  applicationId: propApplicationId,
}: {
  application: Record<string, any> | null;
  applicationId?: string;
}) {
  const applicationId = propApplicationId ?? (application ? String(application.id ?? "") : "");
  const [tasks, setTasks] = useState<TaskStatus | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    setTasks(null);
    setTasksError(null);
    fetchTaskStatus(applicationId)
      .then((d) => { if (active) setTasks(d); })
      .catch(() => { if (active) setTasksError("Could not load task status."); });
    return () => { active = false; };
  }, [applicationId]);

  if (!application) return <div>Loading…</div>;

  const rows: Array<[string, string]> = [
    ["Business", String(application.business_legal_name ?? application.business_name ?? application.name ?? "—")],
    ["Requested Amount", String(application.requested_amount ?? application.loan_amount ?? "—")],
    ["Stage", String(application.pipeline_state ?? application.status ?? "—")],
    ["Created", String(application.created_at ?? "—")],
  ];

  return (
    <div>
      <h2>Overview</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 8 }}>
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt style={{ fontWeight: 600 }}>{label}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </Fragment>
        ))}
      </dl>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>
          Client Tasks
          {tasks && tasks.summary.total > 0 ? ` (${tasks.summary.complete} of ${tasks.summary.total} complete)` : ""}
        </h3>
        {tasksError && <div style={{ color: "#b91c1c" }}>{tasksError}</div>}
        {!tasks && !tasksError && <div style={{ color: "#64748b" }}>Loading…</div>}
        {tasks && tasks.summary.total === 0 && (
          <div style={{ color: "#64748b" }}>No client tasks tracked for this application.</div>
        )}
        {tasks && tasks.summary.total > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tasks.tasks.map((t) => (
              <li key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex", width: 18, height: 18, borderRadius: "50%",
                    alignItems: "center", justifyContent: "center", fontSize: 12, lineHeight: 1,
                    color: "#fff", background: t.complete ? "#16a34a" : "#cbd5e1",
                  }}
                >
                  {t.complete ? "✓" : ""}
                </span>
                <span style={{ color: t.complete ? "#16a34a" : "#334155" }}>{t.label}</span>
              </li>
            ))}
          </ul>
        )}
        {tasks && tasks.summary.allComplete && (
          <div style={{ marginTop: 8, color: "#16a34a", fontWeight: 600 }}>All client tasks complete ✓</div>
        )}
      </div>
    </div>
  );
}
