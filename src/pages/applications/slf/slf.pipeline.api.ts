import { api } from "@/lib/api";
import type { SLFPipelineApplication, SLFStageId } from "./slf.pipeline.types";

const API_PREFIX = "";
export const slfPipelineApi = {
  fetchColumn: async (stage: SLFStageId, options?: { signal?: AbortSignal }) => {
    const res = await api.getList<SLFPipelineApplication>(`${API_PREFIX}/slf/applications?stage=${stage}`, options);
    return res;
  },
  moveCard: async (applicationId: string, newStage: SLFStageId) => {
    return api.patch<SLFPipelineApplication>(`${API_PREFIX}/slf/applications/${applicationId}/status`, { status: newStage });
  },
  fetchSummary: async (applicationId: string) => {
    return api.get<SLFPipelineApplication>(`${API_PREFIX}/slf/applications/${applicationId}/summary`);
  }
};

export type SLFPipelineApi = typeof slfPipelineApi;
