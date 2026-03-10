import { apiClient } from "@/lib/apiClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    return apiClient.post("/api/slf/pipeline", filters ?? {});
  },

  updateStage: async (applicationId, stage) => {
    return apiClient.patch(`/api/slf/pipeline/${applicationId}/stage`, { stage });
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/api/slf/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData;
  },
};
