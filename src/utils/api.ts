import type { ApiResponse } from "@/types/api";
import { apiClient } from "@/api/httpClient";
import { API_BASE } from "@/config/api";
import { API_ROUTES } from "@/contracts/api";

export { API_BASE };

type ApiClientOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function api<T>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let json: unknown;

  try {
    json = await res.json();
  } catch {
    return {
      success: false,
      error: { message: "Invalid JSON response" },
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: {
        message: (json as { message?: string } | null)?.message || "Request failed",
        details: json,
      },
    };
  }

  return {
    success: true,
    data: json as T,
  };
}

export async function checkStaffServerHealth(): Promise<boolean> {
  const result = await apiClient.get<{ success?: boolean }>(API_ROUTES.health, { skipAuth: true });
  return result.success === true;
}
