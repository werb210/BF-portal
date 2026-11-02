// BF_PORTAL_v872_FORECAST - the revenue forecast (BF-Server /api/forecast). Shapes match src/forecast/forecast.ts there.
import { api } from "@/api";

export type Category = "pipeline" | "best_case" | "commit" | "omit";
export type Bucket = { closed: number; commit: number; best_case: number; pipeline: number; weighted: number; closed_amount: number; files: number; goal_commission: number | null; goal_funding: number | null };
export type Period = { key: string; label: string; start: string; end: string };
export type Deal = { id: string; name: string; owner: string | null; owner_name: string; stage: string; probability: number; category: Category; expected_close_date: string | null; commission: number; weighted: number; period: string | null; overdue: boolean };
export type Forecast = {
  granularity: "month" | "quarter"; from: string; periods: Period[]; currency: string; own: boolean; team_id: string | null; probabilities: Record<string, number>;
  reps: Array<{ user_id: string | null; name: string; periods: Bucket[] }>;
  teams: Array<{ team_id: string; name: string; periods: Bucket[] }>;
  total: Bucket[]; unscheduled: { files: number; pipeline: number; weighted: number }; overdue_files: number; deals: Deal[];
};
export type FileForecast = { application_id: string; stage: string; expected_close_date: string | null; forecast_category: Category | null; probability: number; effective_category: Category | "closed" };

export const forecastApi = {
  get: (q: { granularity: "month" | "quarter"; periods?: number; team_id?: string }) => {
    const p = new URLSearchParams({ granularity: q.granularity, ...(q.periods ? { periods: String(q.periods) } : {}), ...(q.team_id ? { team_id: q.team_id } : {}) });
    return api.get<Forecast & { ok: boolean }>(`/api/forecast?${p.toString()}`);
  },
  stages: () => api.get<{ ok: boolean; stages: Array<{ stage: string; probability: number }> }>("/api/forecast/stages"),
  saveStages: (stages: Record<string, number>) => api.put<{ ok: boolean; stages: Array<{ stage: string; probability: number }> }>("/api/forecast/stages", { stages }),
  file: (id: string) => api.get<FileForecast & { ok: boolean }>(`/api/forecast/applications/${encodeURIComponent(id)}`),
  setFile: (id: string, patch: { expected_close_date?: string | null; forecast_category?: Category | null }) =>
    api.put<FileForecast & { ok: boolean }>(`/api/forecast/applications/${encodeURIComponent(id)}`, patch),
};

export const CATEGORY_LABEL: Record<Category | "closed", string> = { pipeline: "Pipeline", best_case: "Best case", commit: "Commit", omit: "Left out", closed: "Closed" };
export const money = (v: number | null | undefined) => (v === null || v === undefined ? "-" : "$" + Math.round(v).toLocaleString("en-CA"));
