import { apiClient } from "@/lib/apiClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    return apiClient.post("/api/bi/pipeline", filters ?? {});
  },

  updateStage: async (applicationId, stage) => {
    return apiClient.patch(`/api/bi/pipeline/${applicationId}/stage`, { stage });
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/api/bi/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData;
  },
};
