import type { ApiResponse } from "@/types/api";

export function assertApiResponse<T>(data: unknown): T {
  const res = data as ApiResponse<T> | null;

  if (!res || typeof res !== "object") {
    throw new Error("Invalid API response");
  }

  if (!("success" in res)) {
    throw new Error("Missing success field");
  }

  if (res.success === false) {
    throw new Error(res.error || "API failure");
  }

  return res.data;
}
