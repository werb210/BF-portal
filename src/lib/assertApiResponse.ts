import type { ApiResponse } from "@/types/api";

export function assertApiResponse<T>(data: unknown): T {
  const res = data as ApiResponse<T> | null;

  if (!res || typeof res !== "object") {
    throw new Error("INVALID_RESPONSE");
  }

  if (res["success"] !== true) {
    throw new Error("API_FAILURE");
  }

  if (!("data" in res)) {
    throw new Error("MISSING_DATA");
  }

  return res["data"] as T;
}
