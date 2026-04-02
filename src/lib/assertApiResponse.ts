import { ApiResponseSchema } from "@boreal/shared-contract";

export function assertApiResponse<T>(data: unknown): T {
  const parsed = ApiResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("API_CONTRACT_VIOLATION");
  }

  if (parsed.data.status !== "ok") {
    throw new Error(parsed.data.error || "API_FAILURE");
  }

  return parsed.data.data as T;
}
