import { useEffect, useState } from "react";
import api from "@/lib/apiClient";

type DashboardData = {
  totalApplications: number;
  documentsPending: number;
  approved: number;
  rejected: number;
  referrers: number;
  lenders: number;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await api.get("/api/bi/dashboard");
        setData((res?.data ?? res) as DashboardData);
      } catch (e) {
        console.error(e);
        throw new Error("Something failed. Check console.");
      }
    };

    loadDashboard();
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>BI Dashboard</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Card title="Total Applications" value={data.totalApplications} />
        <Card title="Documents Pending" value={data.documentsPending} />
        <Card title="Approved" value={data.approved} />
        <Card title="Rejected" value={data.rejected} />
        <Card title="Referrers" value={data.referrers} />
        <Card title="Lenders" value={data.lenders} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        background: "#10263f",
        padding: 20,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)"
      }}
    >
      <h3>{title}</h3>
      <h2>{value}</h2>
    </div>
  );
}
