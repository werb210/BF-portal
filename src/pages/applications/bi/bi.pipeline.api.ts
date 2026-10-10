import { rawApiFetch } from "@/api";
import type {
  BIActivityItem,
  BIPipelineApplication,
  BIRequirementHistoryItem,
  BIRequirementItem,
  BIRequirementStatus,
  BIStageId
} from "./bi.pipeline.types";

const BI_API_PREFIX = "/api/v1/bi";

const BI_TOKEN_KEY = "bi_access_token";
const BI_REFRESH_TOKEN_KEY = "bi_refresh_token";

const clearBiTokens = () => {
  localStorage.removeItem(BI_TOKEN_KEY);
  localStorage.removeItem(BI_REFRESH_TOKEN_KEY);
};

// BF_PORTAL_BLOCK_v87_SILO_CASING_AND_BI_PIPELINE_v1 — fall back to the
// shared BF JWT when no BI-specific token is set. Per the locked rulings,
// BF-Server and BI-Server share JWT_SECRET, so a token issued by BF-Server
// validates on BI-Server. Without this, every newly-logged-in staff user
// hit the legacy "BI Login" panel on the BI Pipeline page even though they
// were already authenticated.
const BF_AUTH_TOKEN_KEY = (import.meta as any).env?.VITE_JWT_STORAGE_KEY || "auth_token";
const getBiToken = () =>
  localStorage.getItem(BI_TOKEN_KEY) || localStorage.getItem(BF_AUTH_TOKEN_KEY);

const parsePayload = async <T>(response: Response): Promise<T> => {
  const body = await response.json();
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return body as T;
};

const biRequest = async <T>(path: string, options: RequestInit & { params?: Record<string, string> } = {}): Promise<T> => {
  const token = getBiToken();
  const headers = {
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const query = options.params
    ? `?${new URLSearchParams(
        Object.entries(options.params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {})
      ).toString()}`
    : "";

  const execute = () =>
    rawApiFetch(`${path}${query}`, {
      ...options,
      headers
    });

  // BF_PORTAL_V780 - BI screens use the staff sign-in token; the old BI refresh/login addresses never existed on BI-Server.
  const response = await execute();

  if (response.status === 401) {
    clearBiTokens();
    window.dispatchEvent(new CustomEvent("bi:auth-expired"));
    throw new Error("BI_AUTH_EXPIRED");
  }

  if (!response.ok) {
    const err = new Error(`HTTP_${response.status}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return parsePayload<T>(response);
};

type BIDocument = { id: string; file_name: string; original_filename?: string; url: string; uploaded_at: string };

const normalizeDocument = (doc: BIDocument) => ({
  id: doc.id,
  file_name: doc.file_name || doc.original_filename || "Untitled document",
  url: doc.url,
  uploaded_at: doc.uploaded_at
});

const normalizeApplication = (app: BIPipelineApplication): BIPipelineApplication => {
  const normalizedStage = app.stage === "approved" ? "bound" : app.stage;

  if (!app.quote_summary) return { ...app, stage: normalizedStage as BIPipelineApplication["stage"] };
  if (typeof app.quote_summary === "string") {
    try {
      return {
        ...app,
        stage: normalizedStage as BIPipelineApplication["stage"],
        quote_summary: JSON.parse(app.quote_summary) as BIPipelineApplication["quote_summary"]
      };
    } catch {
      return {
        ...app,
        stage: normalizedStage as BIPipelineApplication["stage"],
        quote_summary: { notes: app.quote_summary }
      };
    }
  }
  return { ...app, stage: normalizedStage as BIPipelineApplication["stage"] };
};

export const biPipelineApi = {
  fetchColumn: (stage: BIStageId, options?: { signal?: AbortSignal }) =>
    biRequest<BIPipelineApplication[]>(`${BI_API_PREFIX}/pipeline`, { ...options, method: "GET", params: { stage } }).then((rows) =>
      rows.map(normalizeApplication)
    ),
  moveCard: (applicationId: string, newStage: BIStageId) =>
    biRequest<BIPipelineApplication>(`${BI_API_PREFIX}/pipeline/${applicationId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage: newStage })
    }),
  fetchDetail: (applicationId: string, options?: { signal?: AbortSignal }) =>
    biRequest<BIPipelineApplication>(`${BI_API_PREFIX}/applications/${applicationId}`, { ...options, method: "GET" }).then(normalizeApplication),
  fetchActivity: (applicationId: string, options?: { signal?: AbortSignal }) =>
    biRequest<BIActivityItem[]>(`${BI_API_PREFIX}/applications/${applicationId}/activity`, { ...options, method: "GET" }),
  fetchDocuments: async (applicationId: string, options?: { signal?: AbortSignal }) => {
    try {
      const docs = await biRequest<BIDocument[]>(`${BI_API_PREFIX}/applications/${applicationId}/documents`, {
        ...options,
        method: "GET"
      });
      return docs.map(normalizeDocument);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 404 || status === 501) {
        return [];
      }
      throw error;
    }
  },
  fetchRequirements: (applicationId: string, options?: { signal?: AbortSignal }) =>
    biRequest<BIRequirementItem[]>(`${BI_API_PREFIX}/applications/${applicationId}/requirements`, { ...options, method: "GET" }),
  fetchRequirementHistory: (applicationId: string, options?: { signal?: AbortSignal }) =>
    biRequest<BIRequirementHistoryItem[]>(`${BI_API_PREFIX}/applications/${applicationId}/requirements/history`, {
      ...options,
      method: "GET"
    }),
  updateRequirement: (applicationId: string, requirementId: string, status: BIRequirementStatus) =>
    biRequest<BIRequirementItem>(`${BI_API_PREFIX}/applications/${applicationId}/requirements/${requirementId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  hasToken: () => Boolean(getBiToken()),
  clearTokens: clearBiTokens
};

export type BIPipelineApi = typeof biPipelineApi;
