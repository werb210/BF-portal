import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";

const API_PREFIX = "";
export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    return apiClient.post<{ stages: PipelineStage[]; applications: PipelineApplication[] }>("/api/slf/pipeline", filters ?? {});
  },

  updateStage: async (applicationId, stage) => {
    const result = await apiClient.patch(`${API_PREFIX}/slf/pipeline/${applicationId}/stage`, { stage });
    return result;
  },

  exportApplications: async (ids) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/slf/pipeline/export`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids })
    });
    return response.blob();
  },
};
