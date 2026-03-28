import type { ApiResponse } from "@/types/api";

export function assertApiResponse<T>(data: unknown): asserts data is ApiResponse<T> {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid API response: expected object payload");
  }

  const payload = data as Partial<ApiResponse<T>>;
  if (typeof payload.success !== "boolean" || !("data" in payload)) {
    throw new Error("Invalid API response: expected { success, data, error? }");
  }

  if ("error" in payload && typeof payload.error !== "undefined" && typeof payload.error !== "string") {
    throw new Error("Invalid API response: error must be a string when provided");
  }
}

