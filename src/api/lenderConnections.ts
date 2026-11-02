// BF_PORTAL_v873_LENDER_API - lender API connections (BF-Server /api/lender-connections).
import { api } from "@/api";

export type Bucket = "submitted" | "in_review" | "documents_requested" | "offer" | "closing" | "funded" | "declined" | "withdrawn" | "unknown";
export type SecretField = { key: string; label: string; required: boolean; help?: string };
export type ConnectorInfo = {
  kind: string;
  label: string;
  description: string;
  capabilities: { submit: boolean; status: boolean; upload: boolean; webhook: boolean };
  availability: "available" | "awaiting_lender_api_docs";
  secret_fields: SecretField[];
  default_status_map: Record<string, Bucket>;
};
export type MgField = { object: string; section: string; label: string; boreal: string | null; direction: "send" | "read"; apiName: string | null; guessed: boolean };
export type ConnectorsResponse = {
  ok: boolean;
  credentials_key_configured: boolean;
  buckets: Array<{ key: Bucket; label: string }>;
  stages: string[];
  connectors: ConnectorInfo[];
  merchant_growth: { preset: Record<string, unknown>; fields: MgField[]; status_map: Record<string, Bucket>; guessed_statuses: Record<string, Bucket>; requests: string[] };
};
export type StatusMapEntry = { bucket: Bucket; stage?: string | null };
export type Connection = {
  id: string;
  lender_id: string;
  connector: string;
  enabled: boolean;
  submit_by_api: boolean;
  email_fallback: boolean;
  poll_enabled: boolean;
  poll_interval_minutes: number;
  config: Record<string, unknown>;
  secret_hints: Record<string, string>;
  secrets_saved: string[];
  status_map: Record<string, StatusMapEntry>;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_url?: string | null;
  submissions?: { total: number; submitted: number; failing: number } | null;
};
export type ConnectionResponse = { ok: boolean; lender: { id: string; name: string }; credentials_key_configured: boolean; connection: Connection | null };
export type SaveConnectionBody = {
  connector: string;
  enabled: boolean;
  submit_by_api: boolean;
  email_fallback: boolean;
  poll_enabled: boolean;
  poll_interval_minutes: number;
  config: Record<string, unknown>;
  status_map: Record<string, StatusMapEntry>;
  secrets?: Record<string, string | null>;
};

export type ApiEvent = { id: string; lender_id: string; kind: string; source: string; status: string | null; detail: string | null; created_at: string };
export type ApiCondition = { id: string; lender_id: string; external_id: string; kind: "condition" | "document_request"; description: string; document_type: string | null; status: "open" | "satisfied" | "waived"; first_seen_at: string };
export type ApiOffer = { id: string; lender_id: string; lender_name: string; amount: string | number | null; rate_factor: string | null; term: string | null; payment_frequency: string | null; expiry_date: string | null; status: string; created_at: string };
export type ApiSubmission = {
  id: string; lender_id: string; status: string; external_id: string | null; lender_status: string | null; lender_status_label: string | null;
  bucket: Bucket | null; attempts: number; last_error: string | null; warnings: string[] | null; funded_amount: string | number | null;
  submitted_at: string | null; last_synced_at: string | null; next_retry_at: string | null;
};
export type AppLender = {
  lender_id: string; lender_name: string; connector: string; connector_label: string; enabled: boolean; submit_by_api: boolean; email_fallback: boolean;
  availability: string; capabilities: ConnectorInfo["capabilities"] | null; can_submit: boolean;
  submission: ApiSubmission | null; events: ApiEvent[]; conditions: ApiCondition[]; offers: ApiOffer[];
};
export type AppLendersResponse = { ok: boolean; buckets: Record<string, string>; lenders: AppLender[] };

const enc = encodeURIComponent;
export const fetchConnectors = () => api.get<ConnectorsResponse>("/api/lender-connections/connectors");
export const fetchFieldKeys = () => api.get<{ ok: boolean; keys: Array<{ key: string; label: string }> }>("/api/lender-connections/field-keys");
export const fetchConnection = (lenderId: string) => api.get<ConnectionResponse>(`/api/lender-connections/lenders/${enc(lenderId)}`);
export const saveConnection = (lenderId: string, body: SaveConnectionBody) => api.put<{ ok: boolean; connection: Connection | null; problems: string[] }>(`/api/lender-connections/lenders/${enc(lenderId)}`, body);
export const testConnection = (lenderId: string) => api.post<{ ok: boolean; test: { ok: boolean; message: string } }>(`/api/lender-connections/lenders/${enc(lenderId)}/test`, {});
export const rotateWebhookAddress = (lenderId: string) => api.post<{ ok: boolean; webhook_url: string | null }>(`/api/lender-connections/lenders/${enc(lenderId)}/webhook-address`, {});
export const deleteConnection = (lenderId: string) => api.delete<{ ok: boolean }>(`/api/lender-connections/lenders/${enc(lenderId)}`);
export const fetchConnectionLog = (lenderId: string) => api.get<{ ok: boolean; submissions: Array<Record<string, any>> }>(`/api/lender-connections/log?lender_id=${enc(lenderId)}&limit=50`);

export const fetchAppLenders = (appId: string) => api.get<AppLendersResponse>(`/api/lender-connections/applications/${enc(appId)}`);
export const submitByApi = (appId: string, lenderId: string) => api.post<{ ok: boolean; external_id?: string | null; warnings?: string[]; message?: string }>(`/api/lender-connections/applications/${enc(appId)}/lenders/${enc(lenderId)}/submit`, {});
export const syncNow = (appId: string, lenderId: string) => api.post<{ ok: boolean }>(`/api/lender-connections/applications/${enc(appId)}/lenders/${enc(lenderId)}/sync`, {});
export const fetchSendableFiles = (appId: string, lenderId: string) => api.get<{ ok: boolean; files: Array<{ category: string; filename: string; size: number }> }>(`/api/lender-connections/applications/${enc(appId)}/lenders/${enc(lenderId)}/files`);
export const sendDocument = (appId: string, lenderId: string, file: { category: string; filename: string }) => api.post<{ ok: boolean }>(`/api/lender-connections/applications/${enc(appId)}/lenders/${enc(lenderId)}/documents`, file);

/** The server's message out of a thrown ApiError (the api client puts payload.message ?? payload.error in message). */
export function apiMessage(err: unknown, fallback: string): string {
  const body = (err as { details?: any } | null)?.details;
  if (body && typeof body === "object" && typeof body.message === "string" && body.message.trim()) return body.message;
  const m = err instanceof Error ? err.message : "";
  return m && m !== "API_ERROR" && !/^[a-z_]+$/.test(m) ? m : fallback;
}
