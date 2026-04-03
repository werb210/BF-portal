import { apiCall } from "@/lib/api";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  return apiCall(path, options);
}
