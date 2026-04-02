import { getEnv } from "@/config/env";
import { api } from "@/lib/api";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";

export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: (filters) =>
    api<{ stages: PipelineStage[]; applications: PipelineApplication[] }>("/api/slf/pipeline", {
      method: "POST",
      body: filters ?? {},
    }),

  updateStage: async (applicationId, stage): Promise<void> => {
    await api<void>(`/api/slf/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      body: { stage },
    });
  },

  exportApplications: async (ids) => {
    const response = await fetch(`${getEnv().VITE_API_URL}/api/slf/pipeline/export`, {
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
