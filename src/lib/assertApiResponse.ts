import type { ApiResponse } from "@/types/api";

export function assertApiResponse<T>(data: unknown): T {
  if (!data || typeof data !== "object" || typeof (data as { success?: unknown }).success !== "boolean") {
    throw new Error("Invalid API response");
  }

  const payload = data as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}
