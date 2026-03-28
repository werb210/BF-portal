import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

const API_PREFIX = "";
export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    const response = await apiClient.post("/slf/pipeline", filters ?? {});
    return response.data;
  },

  updateStage: async (applicationId, stage) => {
    const response = await apiClient.patch(`${API_PREFIX}/slf/pipeline/${applicationId}/stage`, { stage });
    return response.data;
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/slf/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData.data;
  },
};
