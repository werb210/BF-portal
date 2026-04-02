import { isApiError, type ApiResponse } from "@/api/types";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

const normalizeBody = (body: ApiOptions["body"]): BodyInit | undefined => {
  if (body == null) return undefined;
  if (typeof body === "string" || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob || body instanceof ArrayBuffer) {
    return body;
  }
  return JSON.stringify(body);
};

export async function api<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
    body: normalizeBody(options.body),
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (isApiError(json)) {
    throw new Error(json.error.message || "API error");
  }

  return json.data;
}

export async function apiBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  return res.blob();
}
