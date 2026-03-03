import { Link, Route, Routes } from "react-router-dom";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import BICRM from "./crm/BICRM";
import BILenderPortal from "./lender/BILenderPortal";
import BIApplicationDetail from "./pipeline/BIApplicationDetail";
import BIReports from "./reports/BIReports";
import { biPipelineAdapter } from "./bi.pipeline.adapter";

export default function BISilo() {
  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <header className="bg-brand-bg border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Boreal Insurance – Portal
          </h2>

          <nav className="space-x-6 text-sm text-white/80">
            <Link to="pipeline" className="hover:text-white">Pipeline</Link>
            <Link to="crm" className="hover:text-white">CRM</Link>
            <Link to="reports" className="hover:text-white">Reports</Link>
            <Link to="lender" className="hover:text-white">Lender</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <Routes>
          <Route
            path="pipeline"
            element={
              <PipelineEngineProvider
                config={{
                  businessUnit: "BI",
                  api: biPipelineAdapter,
                }}
              >
                <PipelinePage />
              </PipelineEngineProvider>
            }
          />
          <Route path="pipeline/:id" element={<BIApplicationDetail />} />
          <Route path="crm" element={<BICRM />} />
          <Route path="reports" element={<BIReports />} />
          <Route path="lender" element={<BILenderPortal />} />
        </Routes>
      </main>
    </div>
  );
}
