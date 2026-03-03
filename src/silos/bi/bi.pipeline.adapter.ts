import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";

export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async (filters, options) => {
    const res = await fetch("/api/bi/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      signal: options?.signal,
    });
    if (!res.ok) throw new Error("BI pipeline fetch failed");
    return res.json();
  },

  updateStage: async (applicationId, stage) => {
    const res = await fetch(`/api/bi/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) throw new Error("BI stage update failed");
    return res.json();
  },

  exportApplications: async (ids) => {
    const res = await fetch("/api/bi/pipeline/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("BI export failed");
    return res.blob();
  },
};
