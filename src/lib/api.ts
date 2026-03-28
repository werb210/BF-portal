import axios from "axios";
import { assertApiResponse } from "@/lib/assertApiResponse";
import { requireAuth } from "@/utils/requireAuth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 5000,
});

// ✅ RESTORE DEFAULT EXPORT
export default api;

export async function apiRequest<T = unknown>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  data?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = requireAuth();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await api.request({
    method,
    url,
    data,
    headers,
  });

  return assertApiResponse(response);
}
