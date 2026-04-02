import type { ApiResponse } from "@boreal/shared-contract";

export type { ApiResponse };

export function isApiError(res: unknown): res is Extract<ApiResponse<unknown>, { status: "error" }> {
  return typeof res === "object" && res !== null && (res as { status?: unknown }).status === "error";
}
