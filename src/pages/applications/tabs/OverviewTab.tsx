import { Fragment } from "react";

export default function OverviewTab({ application }: { application: Record<string, any> | null }) {
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
    </div>
  );
}
