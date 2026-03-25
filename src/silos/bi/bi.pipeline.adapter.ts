import { apiClient } from "@api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

const API_PREFIX = "";
export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    const response = await apiClient.post("/bi/pipeline", filters ?? {});
    return response.data;
  },

  updateStage: async (applicationId, stage) => {
    const response = await apiClient.patch(`${API_PREFIX}/bi/pipeline/${applicationId}/stage`, { stage });
    return response.data;
  },

  exportApplications: async (ids) => {
    const blobData = await apiClient.post<Blob>("/bi/pipeline/export", { ids }, {
      responseType: "blob"
    });
    return blobData.data;
  },
};
