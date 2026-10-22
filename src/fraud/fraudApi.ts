// BF_PORTAL_v846_FRAUD - the fraud-protection API (BF-Server /api/fraud, ported from Keystone). Boreal has no plans:
// all 15 checks always run. The server answers 404 for a file outside the silo chosen in the topbar (X-Silo).
import { api } from "@/api";

export type FraudStatus = "green" | "amber" | "red" | "not_configured" | "not_applicable" | "error";
export type CheckState = FraudStatus | "pending" | "per_document";
export type Reason = { code: string; severity: "info" | "amber" | "red"; text: string };

export type FraudCheck = {
  key: string;
  label: string;
  description: string;
  scope: "document" | "application";
  status: CheckState;
  reasons?: Reason[];
  checked_at?: string;
  provider?: string | null;
};

export type DocResult = { status: FraudStatus; reasons: Reason[]; checked_at: string } | null;
export type FraudDocument = { document_id: string; filename: string | null; category: string | null; tamper: DocResult; statement_math: DocResult };

export type FraudScore = {
  score: number;
  band: "low" | "medium" | "high";
  reasons: Array<{ check: string; label: string; severity: "red" | "amber"; text: string }>;
  covered: Array<{ check: string; label: string; status: FraudStatus }>;
  not_covered: Array<{ check: string; label: string; status: FraudStatus; why: string }>;
};

export type FraudOverview = {
  application_id: string;
  checks: FraudCheck[];
  documents: FraudDocument[];
  score: FraudScore | null;
  include_prescreen_in_package: boolean;
  queue: { queued: boolean; done_at: string | null; last_error: string | null };
};

export type NetworkNode = { id: string; type: "application" | "phone" | "email" | "address" | "bank_account" | "device" | "ip" | "director"; label: string; fraud?: boolean; current?: boolean };
export type Network = { nodes: NetworkNode[]; edges: Array<{ from: string; to: string }> };

export type ServiceStatus = { key: string; label: string; provider: string; configured: boolean; setting: string; used_by: string[] };
export type FraudSettings = { watchlist_opt_in: boolean; include_prescreen_in_package: boolean; updated_at: string | null };
export type FraudSettingsView = {
  settings: FraudSettings;
  watchlist: { ready: boolean; why: string | null };
  services: ServiceStatus[];
};
export type StaffAlert = { id: number; kind: string; severity: string; application_id: string | null; created_at: string; staff_name: string | null; detail?: Record<string, unknown> };

const base = (id: string) => `/api/fraud/applications/${encodeURIComponent(id)}`;

export const fraudApi = {
  overview: (id: string) => api.get<FraudOverview & { ok: boolean }>(base(id)),
  run: (id: string) => api.post<{ ok: boolean; queued: boolean }>(`${base(id)}/run`, {}),
  network: (id: string) => api.get<{ ok: boolean; network: Network }>(`${base(id)}/network`),
  prescreen: (id: string) => api.get<{ ok: boolean; score: FraudScore; include_in_package: boolean; lines: string[] }>(`${base(id)}/prescreen`),
  setPrescreen: (id: string, include: boolean) => api.put<{ ok: boolean; include_in_package: boolean }>(`${base(id)}/prescreen`, { include_in_package: include }),
  settings: () => api.get<FraudSettingsView & { ok: boolean }>("/api/fraud/settings"),
  saveSettings: (patch: Partial<Pick<FraudSettings, "watchlist_opt_in" | "include_prescreen_in_package">>) =>
    api.put<{ ok: boolean; settings: FraudSettings; ops: { told: boolean; error: string | null } }>("/api/fraud/settings", patch),
  staffAlerts: () => api.get<{ ok: boolean; alerts: StaffAlert[] }>("/api/fraud/staff-alerts"),
};
