import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import { bfPipelineAdapter } from "@/silos/bf/bf.pipeline.adapter";
import { slfPipelineAdapter } from "@/silos/slf/slf.pipeline.adapter";
import { useSilo } from "@/hooks/useSilo";
import RequireRole from "@/components/auth/RequireRole";
import { canDelete } from "@/auth/canDelete";
import { useAuth } from "@/hooks/useAuth";
import { SILOS } from "@/types/silo";

const ApplicationsContent = () => {
  const { silo } = useSilo();
  const { user } = useAuth();
  const showDelete = canDelete(user?.role as any);
  void showDelete;

  if (silo === SILOS.SLF) {
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
