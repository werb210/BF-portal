// BI_PIPELINE_ALIGN_v57 — BI pipeline adapter aligned with PipelineApiAdapter.
import { api } from "@/api";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineFilters } from "@/core/engines/pipeline/pipeline.types";
import { BI_STAGES, canTransitionManually, type BiStageId } from "./pipeline/biStages";

export const biPipelineAdapter: PipelineApiAdapter = {
  async fetchPipeline(filters: PipelineFilters | undefined, options?: { signal?: AbortSignal }) {
    const params = new URLSearchParams();
    if (filters?.searchTerm) params.set("search", filters.searchTerm);
    if (filters?.stageId) params.set("stage", String(filters.stageId));
    const qs = params.toString();
    const r = await api<{ applications: PipelineApplication[] }>(`/api/v1/bi/applications${qs ? `?${qs}` : ""}`, { signal: options?.signal });
    return {
      stages: BI_STAGES.map((s) => ({ id: s.id, label: s.label, color: s.color, isTerminal: s.isTerminal })),
      applications: r.applications,
    };
  },
  async updateStage(applicationId: string, stage: string): Promise<void> {
    const toStage = stage as BiStageId;
    const fromStage = "under_review" as BiStageId;
    if (!canTransitionManually(fromStage, toStage)) {
      throw new Error(`Stage ${fromStage} → ${toStage} is not a manual transition. PGI-driven stages arrive via webhook.`);
    }
    await api(`/api/v1/bi/applications/${applicationId}/stage`, { method: "PATCH", body: JSON.stringify({ stage: toStage }) });
  },
};

export const isAllowedManualTransition = canTransitionManually;
