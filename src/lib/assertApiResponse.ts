import type { ApiResponse } from "@/types/api";

export function assertApiResponse<T>(data: unknown): T {
  const res = data as ApiResponse<T> | null;

  if (!res || typeof res !== "object") {
    throw new Error("Invalid API response");
  }

  if (res.success !== true) {
    throw new Error(res.error || "API failure");
  }

  if (!("data" in res)) {
    throw new Error("Missing data field");
  }

  return res["data"] as T;
}
