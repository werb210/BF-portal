import { apiClient } from "@/api/client";

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
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url: path,
      method: options.method,
      data:
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body,
      headers: options.headers as Record<string, string> | undefined
    });
    return response.data;
  } catch (error) {
    const candidate = error as { message?: string; response?: { status?: number; data?: unknown } };
    if (candidate?.response || candidate?.message) {
      throw new ApiError({
        status: candidate.response?.status ?? 500,
        message: candidate.message ?? "Request failed",
        details: candidate.response?.data
      });
    }
    throw error;
  }
}

export const request = apiFetch;
export const api = apiClient;
export default apiClient;
