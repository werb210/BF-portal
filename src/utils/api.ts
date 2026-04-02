import { rawApiFetch } from "@/api";
import { ApiResponseSchema } from "@boreal/shared-contract";

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
  const res = await rawApiFetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
    body: normalizeBody(options.body),
  });

  const json = await res.json();
  const parsed = ApiResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("API contract violation");
  }

  if (parsed.data.status === "error") {
    throw new Error(parsed.data.error || "API error");
  }

  return parsed.data.data as T;
}

export async function apiBlob(url: string): Promise<Blob> {
  const res = await rawApiFetch(url);
  if (!res.ok) throw new Error("Download failed");
  return res.blob();
}
