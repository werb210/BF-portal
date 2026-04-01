import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface ReportSummary {
  totalApplications: number;
  policiesIssued: number;
  conversionRate: number;
  premiumVolume: number;
  commissionOutstanding: number;
  claimsRatio: number;
  referralCount: number;
  lenderCount: number;
}

export default function BIReports() {
  const [metrics, setMetrics] = useState<ReportSummary | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await apiClient("/api/bi/reports/summary");
    setMetrics(data as ReportSummary);
  }

  if (!metrics) return <div className="max-w-7xl mx-auto px-6">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl font-semibold mb-8">Boreal Insurance Reports</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI title="Applications (Total)" value={metrics.totalApplications} />
        <KPI title="Policies Issued" value={metrics.policiesIssued} />
        <KPI title="Conversion Rate" value={`${metrics.conversionRate}%`} />

        <KPI
          title="Premium Volume"
          value={`$${metrics.premiumVolume.toLocaleString()}`}
        />

        <KPI
          title="Commission Outstanding"
          value={`$${metrics.commissionOutstanding.toLocaleString()}`}
        />

        <KPI title="Claims Ratio" value={`${metrics.claimsRatio}%`} />

        <KPI title="Referral Volume" value={metrics.referralCount} />

        <KPI title="Lender Volume" value={metrics.lenderCount} />
      </div>

      <button
        className="mt-8 bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium"
        onClick={() => {
          window.location.href = "/bi/reports/commission";
        }}
      >
        View Detailed Commission Ledger
      </button>
    </div>
  );
}

function KPI({ title, value }:{title:string,value:any}){
  return (
    <div className="bg-brand-surface border border-card rounded-xl p-6 shadow-soft text-center">
      <h4 className="text-sm text-white/70">{title}</h4>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}
