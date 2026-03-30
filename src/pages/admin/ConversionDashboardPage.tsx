import { useEffect, useState } from "react";
import api from "@/lib/api";

type ConversionStats = {
  visitors: number;
  leads: number;
  applications: number;
  rate: number;
};

export default function ConversionDashboardPage() {
  const [stats, setStats] = useState<ConversionStats | null>(null);

  useEffect(() => {
    api.get("/admin/conversion-stats").then((res) => {
      setStats(res.data);
    });
  }, []);

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Conversion Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Stat label="Visitors" value={stats.visitors} />
        <Stat label="Leads" value={stats.leads} />
        <Stat label="Applications" value={stats.applications} />
        <Stat label="Conversion Rate" value={`${stats.rate}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-4 shadow rounded text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  );
}
