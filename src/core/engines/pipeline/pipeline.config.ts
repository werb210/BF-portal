import type { PipelineApplication, PipelineFilters, PipelineStage } from "./pipeline.types";

export type BusinessUnit = "BF" | "BI" | "SLF";

export interface PipelineApiAdapter {
  fetchPipeline: (
    filters: PipelineFilters | undefined,
    options?: { signal?: AbortSignal }
  ) => Promise<{ stages: PipelineStage[]; applications: PipelineApplication[] }>;
  updateStage: (applicationId: string, stage: string) => Promise<unknown>;
  exportApplications?: (ids: string[]) => Promise<Blob>;
}

export interface PipelineEngineConfig {
  businessUnit: BusinessUnit;
  api: PipelineApiAdapter;
}
