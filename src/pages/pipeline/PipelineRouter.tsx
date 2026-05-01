// BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE
// Resolves to BIPipelinePage when active silo is BI, else the existing
// BF PipelinePage. Both target components retain their current internal
// data fetching.
import PipelinePage from "@/pages/pipeline/PipelinePage";
import BIPipelinePage from "@/pages/applications/bi/BIPipelinePage";
import { useBusinessUnit } from "@/context/BusinessUnitContext";

export default function PipelineRouter() {
  const { activeBusinessUnit } = useBusinessUnit();
  if (activeBusinessUnit === "BI") {
    return <BIPipelinePage />;
  }
  return <PipelinePage />;
}
