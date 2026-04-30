// BI_PGI_ALIGNMENT_v56 — 6-tab BI silo nav: Dashboard, Pipeline, CRM, Lender, Marketing, Settings.
import { Link, Route, Routes } from "react-router-dom";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import BICRM from "./crm/BICRM";
import BILenderManagement from "./lender/BILenderManagement";
import BIDashboard from "./dashboard/BIDashboard";
import BIMarketing from "./marketing/BIMarketing";
import BISettings from "./settings/BISettings";
import BIApplicationDetail from "./pipeline/BIApplicationDetail";
import { biPipelineAdapter } from "./bi.pipeline.adapter";

export default function BISilo() {
  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <header className="bg-brand-bg border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Boreal Insurance — Portal</h2>
          <nav className="space-x-6 text-sm text-white/80">
            <Link to="dashboard" className="hover:text-white">Dashboard</Link>
            <Link to="pipeline" className="hover:text-white">Pipeline</Link>
            <Link to="crm" className="hover:text-white">CRM</Link>
            <Link to="lender" className="hover:text-white">Lender</Link>
            <Link to="marketing" className="hover:text-white">Marketing</Link>
            <Link to="settings" className="hover:text-white">Settings</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <Routes>
          <Route path="dashboard" element={<BIDashboard />} />
          <Route path="pipeline" element={
            <PipelineEngineProvider config={{ businessUnit: "BI", api: biPipelineAdapter }}>
              <PipelinePage />
            </PipelineEngineProvider>
          } />
          <Route path="pipeline/:id" element={<BIApplicationDetail />} />
          <Route path="crm" element={<BICRM />} />
          <Route path="lender" element={<BILenderManagement />} />
          <Route path="marketing" element={<BIMarketing />} />
          <Route path="settings" element={<BISettings />} />
        </Routes>
      </main>
    </div>
  );
}
