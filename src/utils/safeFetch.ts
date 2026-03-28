import { apiRequest } from "@/lib/api";

export async function safeFetch(url: string, options?: RequestInit) {
  try {
    return await apiRequest(url, {
      method: options?.method,
      data: options?.body,
      headers: options?.headers as Record<string, string> | undefined,
    });
  } catch {
    console.warn("API unavailable:", url);
    return {};
  }
}
