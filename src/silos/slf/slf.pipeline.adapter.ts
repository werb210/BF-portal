import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

const API_PREFIX = "";
export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    const result = await apiClient.post("/slf/pipeline", filters ?? {});
    return result;
  },

  updateStage: async (applicationId, stage) => {
    const result = await apiClient.patch(`${API_PREFIX}/slf/pipeline/${applicationId}/stage`, { stage });
    return result;
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/slf/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData;
  },
};
