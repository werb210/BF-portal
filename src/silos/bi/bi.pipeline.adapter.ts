import { api } from "@/utils/api";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";

export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: (filters) =>
    api<{ stages: PipelineStage[]; applications: PipelineApplication[] }>("/api/bi/pipeline", {
      method: "POST",
      body: JSON.stringify(filters ?? {}),
    }),

  updateStage: async (applicationId, stage): Promise<void> => {
    await api<void>(`/api/bi/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
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
