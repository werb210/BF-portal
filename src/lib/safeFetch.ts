import { apiRequest } from "@/lib/api";

export async function safeFetch<T = unknown>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const data = await apiRequest<T>(url, {
      method: options?.method,
      data: options?.body,
      headers: options?.headers as Record<string, string> | undefined,
    });
    return data;
  } catch {
    console.warn("API failure:", url);
    return null;
  }
}
