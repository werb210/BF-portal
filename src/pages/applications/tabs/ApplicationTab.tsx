import { Fragment } from "react";

export default function ApplicationTab({ application }: { application: Record<string, any> | null }) {
  if (!application) return <div>Loading…</div>;

  return (
    <div>
      <h2>Application</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "220px 1fr", rowGap: 8 }}>
        {Object.entries(application)
          .slice(0, 24)
          .map(([key, value]) => (
            <Fragment key={key}>
              <dt style={{ color: "#64748b" }}>{key}</dt>
              <dd style={{ margin: 0 }}>{String(value ?? "—")}</dd>
            </Fragment>
          ))}
      </dl>
    </div>
  );
}
