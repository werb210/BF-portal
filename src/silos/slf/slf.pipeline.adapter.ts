import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

const SLF_BASE_URL = process.env.VITE_SLF_API_BASE_URL;

export const slfPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters, options) => {
    const res = await fetch(`${SLF_BASE_URL}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      signal: options?.signal,
    });
    if (!res.ok) throw new Error("SLF pipeline fetch failed");
    return res.json();
  },

  updateStage: async (applicationId, stage) => {
    const res = await fetch(`${SLF_BASE_URL}/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) throw new Error("SLF stage update failed");
    return res.json();
  },

  exportApplications: async (ids) => {
    const res = await fetch(`${SLF_BASE_URL}/pipeline/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("SLF export failed");
    return res.blob();
  },
};
