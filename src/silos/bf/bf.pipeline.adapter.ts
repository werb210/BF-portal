import { updatePortalApplication } from "@/api/applications";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const bfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: pipelineApi.fetchPipeline,
  updateStage: (id, stage) => updatePortalApplication(id, { stage }),
  exportApplications: pipelineApi.exportApplications
};
