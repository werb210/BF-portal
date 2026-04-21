import { api } from "@/api";
import type { BIActivityItem, BIPipelineApplication, BIRequirementItem, BIRequirementStatus, BIStageId } from "./bi.pipeline.types";

const BI_API_PREFIX = "/api/v1/bi";

export const biPipelineApi = {
  fetchColumn: (stage: BIStageId, options?: { signal?: AbortSignal }) =>
    api.getList<BIPipelineApplication>(`${BI_API_PREFIX}/pipeline`, { ...options, params: { stage } }),
  moveCard: (applicationId: string, newStage: BIStageId) =>
    api.patch<BIPipelineApplication>(`${BI_API_PREFIX}/pipeline/${applicationId}/stage`, { stage: newStage }),
  fetchDetail: (applicationId: string, options?: { signal?: AbortSignal }) =>
    api.get<BIPipelineApplication>(`${BI_API_PREFIX}/applications/${applicationId}`, options),
  fetchActivity: (applicationId: string, options?: { signal?: AbortSignal }) =>
    api.getList<BIActivityItem>(`${BI_API_PREFIX}/applications/${applicationId}/activity`, options),
  fetchDocuments: (applicationId: string, options?: { signal?: AbortSignal }) =>
    api.getList<{ id: string; file_name: string; url: string; uploaded_at: string }>(
      `${BI_API_PREFIX}/applications/${applicationId}/documents`,
      options
    ),
  fetchRequirements: (applicationId: string, options?: { signal?: AbortSignal }) =>
    api.getList<BIRequirementItem>(`${BI_API_PREFIX}/applications/${applicationId}/requirements`, options),
  updateRequirement: (applicationId: string, requirementId: string, status: BIRequirementStatus) =>
    api.patch<BIRequirementItem>(`${BI_API_PREFIX}/applications/${applicationId}/requirements/${requirementId}`, { status })
};

export type BIPipelineApi = typeof biPipelineApi;
