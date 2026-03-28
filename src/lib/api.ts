import axios from "axios";
import { assertApiResponse } from "@/lib/assertApiResponse";
import { requireAuth } from "@/utils/requireAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_TIMEOUT_MS = 5000;

export async function apiRequest<T = unknown>(
  method: "get" | "post" | "put" | "delete" | "patch",
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

  const response = await axios({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    method,
    url,
    data,
    headers,
  });

  return assertApiResponse(response);
}
