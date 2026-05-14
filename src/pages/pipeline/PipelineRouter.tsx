// BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1
// The BI silo nav (AppLayout.tsx BI_NAV) links Pipeline to
// /silo/bi/pipeline, which renders the engine-based pipeline via
// biPipelineAdapter + BI_STAGES. The legacy BIPipelinePage path
// (this file's original target) is orphan code from before v200.
// For BI users we redirect /pipeline to /silo/bi/pipeline so the
// BI silo has ONE canonical pipeline; BF + SLF keep using PipelinePage.
import { Navigate } from "react-router-dom";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import { useBusinessUnit } from "@/context/BusinessUnitContext";

export default function PipelineRouter() {
  const { activeBusinessUnit } = useBusinessUnit();
  if (activeBusinessUnit === "BI") {
    return <Navigate to="/silo/bi/pipeline" replace />;
  }
  return <PipelinePage />;
}
