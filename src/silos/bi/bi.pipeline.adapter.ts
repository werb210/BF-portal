import { api } from "@/api";
import type { PipelineApiAdapter } from "@/core/engines/pipeline/pipeline.config";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";

const BI_PIPELINE_STAGE_IDS = [
  "new_application",
  "documents_pending",
  "under_review",
  "approved",
  "declined",
  "policy_issued",
  "quoted",
  "bound",
  "claim",
] as const;

const BI_PIPELINE_STAGES: PipelineStage[] = BI_PIPELINE_STAGE_IDS.map((id, index) => ({
  id,
  label: id
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" "),
  order: index,
}));

const toStringOrUndefined = (value: unknown) => (typeof value === "string" ? value : undefined);

const toNumberOrUndefined = (value: unknown) => (typeof value === "number" ? value : undefined);

const mapApplication = (row: Record<string, unknown>): PipelineApplication => {
  const stage = toStringOrUndefined(row.stage) ?? "new_application";
  const createdAt = toStringOrUndefined(row.created_at) ?? toStringOrUndefined(row.createdAt) ?? new Date(0).toISOString();

  return {
    id: String(row.id ?? ""),
    stage,
    createdAt,
    updatedAt: toStringOrUndefined(row.updated_at) ?? toStringOrUndefined(row.updatedAt),
    contactName: toStringOrUndefined(row.primary_contact_name) ?? toStringOrUndefined(row.contactName),
    businessName: toStringOrUndefined(row.business_name) ?? toStringOrUndefined(row.businessName),
    requestedAmount:
      toNumberOrUndefined(row.requested_amount) ??
      toNumberOrUndefined(row.requestedAmount) ??
      toNumberOrUndefined(row.loan_amount),
    source: toStringOrUndefined(row.source),
    status: toStringOrUndefined(row.status),
  };
};

export const biPipelineAdapter: PipelineApiAdapter = {
  fetchPipeline: async () => {
    const rows = await api<Record<string, unknown>[]>("/api/v1/bi/applications", {
      method: "GET",
    });

    const groupedRows = new Map<string, Record<string, unknown>[]>();
    for (const row of rows ?? []) {
      const stage = toStringOrUndefined(row.stage) ?? "new_application";
      const bucket = groupedRows.get(stage) ?? [];
      bucket.push(row);
      groupedRows.set(stage, bucket);
    }

    const applications = BI_PIPELINE_STAGE_IDS.flatMap((stage) =>
      (groupedRows.get(stage) ?? []).map((row) => mapApplication({ ...row, stage }))
    );

    return {
      stages: BI_PIPELINE_STAGES,
      applications,
    };
  },

  updateStage: async (applicationId, stage): Promise<void> => {
    await api<void>(`/api/v1/bi/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      body: { stage },
    });
  },

  exportApplications: async () => {
    // TODO(feature/bi-silo-api-path-alignment): replace once BI-Server adds /api/v1/bi/pipeline/export.
    throw new Error("Pipeline export is not yet implemented");
  },
};
