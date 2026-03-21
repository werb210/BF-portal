import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    const response = await apiClient.post("/api" + "/bi/pipeline", filters ?? {});
    return response.data;
  },

  updateStage: async (applicationId, stage) => {
    const response = await apiClient.patch(`/api/bi/pipeline/${applicationId}/stage`, { stage });
    return response.data;
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/api" + "/bi/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData.data;
  },
};
