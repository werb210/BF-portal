import api from "@/lib/api";

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = options.headers as Record<string, string> | undefined;
  const method = options.method ?? "GET";

  return api.request<T>({
    url: path,
    method,
    headers,
    data: options.body,
    signal: options.signal
  });
}

export default apiFetch;
