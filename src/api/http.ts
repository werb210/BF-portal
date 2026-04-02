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

import { api as requestApi } from "@/lib/api";

export { requestApi as default };
export { requestApi as api };

export async function request<T>(config: { url?: string; method?: string; data?: unknown; headers?: Record<string, string> }) {
  if ((config.method ?? "GET").toUpperCase() === "POST") {
    return requestApi.post<T>(config.url ?? "/", config.data, { headers: config.headers });
  }

  return requestApi.get<T>(config.url ?? "/", {
    headers: config.headers,
  });
}
