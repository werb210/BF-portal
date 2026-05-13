// BI_PGI_ALIGNMENT_v56 — 6-tab BI silo nav: Dashboard, Pipeline, CRM, Lender, Marketing, Settings.
// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
import { Link, Navigate, Route, Routes } from "react-router-dom";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import BICRM from "./crm/BICRM";
// BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1
import BIContactDetailPage from "./crm/contacts/BIContactDetailPage";
import BILenderManagement from "./lender/BILenderManagement";
import BIReferrerManagement from "./referrer/BIReferrerManagement"; // BF_PORTAL_BLOCK_v198_REFERRER_MANAGEMENT_v1
import BILender from "./lender/BILender"; // BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
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
            <Link to="referrer" className="hover:text-white">Referrer</Link> {/* BF_PORTAL_BLOCK_v198_REFERRER_MANAGEMENT_v1 */}
            <Link to="marketing" className="hover:text-white">Marketing</Link>
            <Link to="settings" className="hover:text-white">Settings</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <Routes>
          {/* BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<BIDashboard />} />
          <Route path="pipeline" element={
            <PipelineEngineProvider config={{ businessUnit: "BI", api: biPipelineAdapter }}>
              <PipelinePage />
            </PipelineEngineProvider>
          } />
          <Route path="pipeline/:id" element={<BIApplicationDetail />} />
          <Route path="crm" element={<BICRM />} />
      {/* BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1 */}
      <Route path="crm/contacts/:id" element={<BIContactDetailPage />} />
          <Route path="lender" element={<BILender />} /> {/* BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1 */}
          <Route path="referrer" element={<BIReferrerManagement />} /> {/* BF_PORTAL_BLOCK_v198_REFERRER_MANAGEMENT_v1 */}
          <Route path="marketing" element={<BIMarketing />} />
          <Route path="settings" element={<BISettings />} />
        </Routes>
      </main>
    </div>
  );
}
