import { ApiResponse } from "@/types/api";

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

  let json: unknown = null;

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
        message: (json as any)?.message || "Request failed",
        details: json,
      },
    };
  }

  return {
    success: true,
    data: json as T,
  };
}

export async function apiBlob(url: string): Promise<Blob> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Download failed");
  }

  return res.blob();
}
