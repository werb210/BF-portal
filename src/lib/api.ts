import { apiRequest as clientApiRequest, type ApiResult, type RequestOptions } from "@/api/client";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function unwrapResult<T>(path: string, result: ApiResult<T>): T {
  if (result.success) return result.data;

  const reason = result.error ?? result.message ?? "unknown error";
  throw new Error(`API request failed for ${path}: ${reason}`);
}

function toRequestOptions(options: RequestInit = {}): RequestOptions {
  const method = (options.method?.toUpperCase() as RequestOptions["method"] | undefined) ?? "GET";
  const body =
    typeof options.body === "string"
      ? (() => {
          try {
            return JSON.parse(options.body);
          } catch {
            return options.body;
          }
        })()
      : options.body;

  return {
    ...options,
    method,
    body,
  };
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = normalizePath(path);
  const result = await clientApiRequest<T>(normalizedPath, toRequestOptions(options));
  return unwrapResult(normalizedPath, result);
}
