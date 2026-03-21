import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    const response = await apiClient.post("/api" + "/slf/pipeline", filters ?? {});
    return response.data;
  },

  updateStage: async (applicationId, stage) => {
    const response = await apiClient.patch(`/api/slf/pipeline/${applicationId}/stage`, { stage });
    return response.data;
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/api" + "/slf/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData.data;
  },
};
