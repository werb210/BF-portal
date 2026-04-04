import { updatePortalApplication } from "@/api/applications";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
export const bfPipelineAdapter = {
    fetchPipeline: pipelineApi.fetchPipeline,
    updateStage: async (id, stage) => {
        await updatePortalApplication(id, { stage });
    },
    exportApplications: pipelineApi.exportApplications
};
