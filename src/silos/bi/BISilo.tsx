// BI_PGI_ALIGNMENT_v56 — 6-tab BI silo nav: Dashboard, Pipeline, CRM, Lender, Marketing, Settings.
// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
import { Navigate, Route, Routes } from "react-router-dom";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import BICRM from "./crm/BICRM";
// BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1
import BIContactDetailPage from "./crm/contacts/BIContactDetailPage";
// BF_PORTAL_BLOCK_v211_BI_COMPANY_DETAIL_v1
import BICompanyDetailPage from "./crm/companies/BICompanyDetailPage";
import BILender from "./lender/BILender"; // BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
import BIDashboard from "./dashboard/BIDashboard";
import BIMarketing from "./marketing/BIMarketing";
import BISettings from "./settings/BISettings";
// BF_PORTAL_BLOCK_BI_SILO_TRIM_v1 -- Marketing tab consolidated into CRM > Outreach (BIMarketing kept on disk for future reuse).
// BF_PORTAL_BLOCK_BI_SILO_TRIM_v1 -- Settings tab removed; sign-in lives in BF silo (design note 7).
import BIApplicationDetail from "./pipeline/BIApplicationDetail";
import { biPipelineAdapter } from "./bi.pipeline.adapter";

export default function BISilo() {
  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <header className="bg-brand-bg border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h2 className="text-xl font-semibold tracking-tight">Boreal Insurance — Portal</h2>
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
      {/* BF_PORTAL_BLOCK_v211_BI_COMPANY_DETAIL_v1 */}
      <Route path="crm/companies/:id" element={<BICompanyDetailPage />} />
          <Route path="lender" element={<BILender />} /> {/* BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1 */}
          <Route path="referrer" element={<Navigate to="/silo/bi/lender?tab=referrer" replace />} />
          {/* BF_PORTAL_BLOCK_BI_SILO_TRIM_v1 -- legacy paths redirect into the consolidated locations */}
          <Route path="marketing" element={<BIMarketing />} />
          <Route path="settings" element={<BISettings />} />
        </Routes>
      </main>
    </div>
  );
}
