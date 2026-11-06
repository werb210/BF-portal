// BF_PORTAL_v870_CRM_DATA_MODEL - BF-Server /api/pipelines: the lending pipeline and extra pipelines with custom stages
// (ported from KS-Portal #41). Extra pipelines belong to the topbar silo.
import { useEffect, useState } from "react";
import { api } from "@/api";

export type Outcome = "open" | "won" | "lost";
export type Stage = { id: string; name: string; position: number; color: string; probability: number; outcome: Outcome; locked: boolean; deals?: number; key?: string; label?: string; hidden?: boolean };
// BF_PORTAL_v909_LENDING_STAGE_DISPLAY - how the lending board shows each stage (the stage's key never changes).
export type LendingStageDisplay = { label: string | null; hidden: boolean; position: number };
export type Pipeline = { id: string; name: string; system: boolean; position: number; stages: Stage[]; archived_at: string | null };
export type PipelineList = { silo?: string; limit: number | null; can_create: boolean; pipelines: Pipeline[] };
export type BoardCard = {
  id: string; name: string; stage_id: string; stage_entered_at: string | null; requested_amount: number | string | null; funded_amount: number | string | null;
  product_category: string | null; lending_stage: string | null; owner_first_name: string | null; owner_last_name: string | null; contact_name: string | null;
};
export type PipelineReport = {
  pipeline: { id: string; name: string; system: boolean };
  stages: Array<{ id: string; name: string; color: string; probability: number; outcome: Outcome; deals: number; amount: number; weighted: number }>;
  totals: { open_deals: number; open_amount: number; weighted_amount: number; won_deals: number; won_amount: number; lost_deals: number };
};

export const LENDING_ID = "lending";

export const pipelinesApi = {
  list: (includeArchived = false) => api.get<PipelineList>("/api/pipelines", includeArchived ? { params: { include_archived: 1 } } : undefined),
  create: (body: unknown) => api.post<{ pipeline: Pipeline }>("/api/pipelines", body),
  update: (id: string, body: unknown) => api.put<{ pipeline: Pipeline }>(`/api/pipelines/${id}`, body),
  archive: (id: string) => api.post(`/api/pipelines/${id}/archive`, {}),
  lendingProbabilities: (body: { [stage: string]: number }) => api.put<{ pipeline: Pipeline }>("/api/pipelines/lending/probabilities", body),
  lendingDisplay: (body: { [stage: string]: LendingStageDisplay }) => api.put<{ pipeline: Pipeline }>("/api/pipelines/lending/display", body),
  board: (id: string, teamId = "") => api.get<{ pipeline: Pipeline; cards: BoardCard[] }>(`/api/pipelines/${id}/board`, teamId ? { params: { team_id: teamId } } : undefined),
  where: (applicationId: string) => api.get<{ pipeline_id: string; stage_id: string | null; stage: string | null }>(`/api/pipelines/application/${applicationId}`),
  move: (applicationId: string, pipelineId: string, stageId?: string | null) =>
    api.post<{ pipeline_id: string; stage: string }>("/api/pipelines/move", { application_id: applicationId, pipeline_id: pipelineId, stage_id: stageId ?? null }),
  report: (pipelineId: string, teamId = "") => api.get<PipelineReport>("/api/pipelines/report", { params: { pipeline_id: pipelineId, ...(teamId ? { team_id: teamId } : {}) } }),
};

/** Every pipeline (lending first); null while loading or when the call fails. */
export function usePipelines(reloadKey = 0): PipelineList | null {
  const [list, setList] = useState<PipelineList | null>(null);
  useEffect(() => {
    let live = true;
    pipelinesApi.list().then((r) => { if (live) setList(r && Array.isArray(r.pipelines) ? r : null); }).catch(() => { if (live) setList(null); });
    return () => { live = false; };
  }, [reloadKey]);
  return list;
}

export const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

/** White or black text, whichever reads better on a stage colour. */
export function textOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const lum = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * lum[0]! + 0.7152 * lum[1]! + 0.0722 * lum[2]!;
  // White or black: one of the two always reaches 4.5:1 on any colour an Admin picks.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#000000";
}
