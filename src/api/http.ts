export type ApiErrorOptions = {
  status: number;
  message: string;
  code?: string;
  requestId?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;

  constructor({ status, message, code, requestId, details }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

import { apiFetch } from "@/api/client";

export { apiFetch as api, apiFetch as default };

export async function apiRequest<T>(config: { url?: string; method?: string; data?: unknown; headers?: Record<string, string> }) {
  const response = await apiFetch(config.url ?? "/", {
    method: config.method,
    headers: config.headers,
    body: config.data !== undefined ? JSON.stringify(config.data) : undefined,
  });

  return (await response.json()) as T;
}
