interface ApplicationOverview {
  id: string;
  stage: string;
  requested_amount: number;
  product_category: string;
  submitted_at: string;
  company_name: string;
  assigned_staff?: string;
}

interface Props {
  application: ApplicationOverview;
}

const STAGE_COLORS: Record<string, string> = {
  Received: "#6366f1",
  "In Review": "#f59e0b",
  "Documents Required": "#ef4444",
  "Additional Steps Required": "#f97316",
  "Off to Lender": "#3b82f6",
  Offer: "#16a34a"
};

export default function ApplicationOverviewTab({ application }: Props) {
  const color = STAGE_COLORS[application?.stage] ?? "#6b7280";

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <span
          style={{
            background: color,
            color: "#fff",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          {application?.stage ?? "—"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <StatCard label="Requested Amount" value={`$${application?.requested_amount?.toLocaleString() ?? "—"}`} />
        <StatCard label="Product Category" value={application?.product_category ?? "—"} />
        <StatCard
          label="Submitted"
          value={application?.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : "—"}
        />
        <StatCard label="Company" value={application?.company_name ?? "—"} />
        <StatCard label="Assigned Staff" value={application?.assigned_staff ?? "Unassigned"} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{value}</div>
    </div>
  );
}
