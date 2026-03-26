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

import api from "@api/client";

export { api as default };
export { api };

export async function apiRequest<T>(config: { url?: string; method?: string; data?: unknown; headers?: Record<string, string> }) {
  if ((config.method ?? "GET").toUpperCase() === "POST") {
    return api.post<T>(config.url ?? "/", config.data, { headers: config.headers });
  }

  return api.get<T>(config.url ?? "/", {
    method: config.method,
    headers: config.headers
  });
}
