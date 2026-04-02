import { apiClient } from "@/api/httpClient";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";

const API_PREFIX = "";
export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters) => {
    return apiClient.post<{ stages: PipelineStage[]; applications: PipelineApplication[] }>("/api/bi/pipeline", filters ?? {});
  },

  updateStage: async (applicationId, stage) => {
    await apiClient.patch(`${API_PREFIX}/bi/pipeline/${applicationId}/stage`, { stage });
  },

  exportApplications: async (ids) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bi/pipeline/export`, {
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
