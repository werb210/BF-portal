import { API_CONTRACT } from "@/contracts";
import { assertContract } from "@/contracts/assert";

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

assertContract(API_BASE, "API_BASE");

export function buildUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(buildUrl(path), {
    ...options,
    credentials: "include",
    headers
  });
}

export const API_PATHS = API_CONTRACT;
