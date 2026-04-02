import { apiClient } from "@/lib/api";
import type { SLFPipelineApplication, SLFStageId } from "./slf.pipeline.types";

const API_PREFIX = "";
export const slfPipelineApi = {
  fetchColumn: async (stage: SLFStageId, options?: { signal?: AbortSignal }) => {
    const res = await apiClient.getList<SLFPipelineApplication>(`${API_PREFIX}/slf/applications?stage=${stage}`, options);
    return res.items;
  },
  moveCard: async (applicationId: string, newStage: SLFStageId) => {
    return apiClient.patch<SLFPipelineApplication>(`${API_PREFIX}/slf/applications/${applicationId}/status`, { status: newStage });
  },
  fetchSummary: async (applicationId: string) => {
    return apiClient.get<SLFPipelineApplication>(`${API_PREFIX}/slf/applications/${applicationId}/summary`);
  }
};

export type SLFPipelineApi = typeof slfPipelineApi;
