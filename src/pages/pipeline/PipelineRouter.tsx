// BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1
// The BI silo nav (AppLayout.tsx BI_NAV) links Pipeline to
// /silo/bi/pipeline, which renders the engine-based pipeline via
// biPipelineAdapter + BI_STAGES. The legacy BIPipelinePage path
// (this file's original target) is orphan code from before v200.
// For BI users we redirect /pipeline to /silo/bi/pipeline so the
// BI silo has ONE canonical pipeline; BF + SLF keep using PipelinePage.
import { Navigate } from "react-router-dom";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import SLFView from "@/silos/slf/SLFView"; // BF_PORTAL_SLF_PIPELINE_ROUTE_v1
import { useBusinessUnit } from "@/context/BusinessUnitContext";

export default function PipelineRouter() {
  const { activeBusinessUnit } = useBusinessUnit();
  if (activeBusinessUnit === "BI") {
    return <Navigate to="/silo/bi/pipeline" replace />;
  }
  // BF_PORTAL_SLF_PIPELINE_ROUTE_v1 - SLF used to fall through to PipelinePage,
  // which reads BF applications from BF-Server, so selecting the SLF silo showed
  // BF deals. SLF data is a read-only mirror served by slf-server under
  // /api/slf/*; SLFView is the component that reads it.
  if (activeBusinessUnit === "SLF") {
    return <SLFView />;
  }
  return <PipelinePage />;
}
