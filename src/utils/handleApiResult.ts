import { ApiResponse } from "@/types/api";

export function handleApiResult<T>(res: ApiResponse<T>): T {
  if ("error" in res) {
    throw new Error(res.error.message);
  }

  return res.data;
}
