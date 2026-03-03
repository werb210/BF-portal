import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import { bfPipelineAdapter } from "@/silos/bf/bf.pipeline.adapter";
import { slfPipelineAdapter } from "@/silos/slf/slf.pipeline.adapter";
import { useSilo } from "@/hooks/useSilo";
import RequireRole from "@/components/auth/RequireRole";

const ApplicationsContent = () => {
  const { silo } = useSilo();

  if (silo === "SLF") {
    return (
      <PipelineEngineProvider
        config={{
          businessUnit: "SLF",
          api: slfPipelineAdapter,
        }}
      >
        <PipelinePage />
      </PipelineEngineProvider>
    );
  }

  return (
    <PipelineEngineProvider
      config={{
        businessUnit: "BF",
        api: bfPipelineAdapter
      }}
    >
      <PipelinePage />
    </PipelineEngineProvider>
  );
};

const ApplicationsPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <ApplicationsContent />
  </RequireRole>
);

export default ApplicationsPage;
