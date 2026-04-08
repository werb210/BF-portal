import { authToken } from "./authToken";
import { assertSilo } from "./siloGuard";

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error("Missing VITE_API_URL");
}

export async function apiCall(path: string, options: RequestInit = {}) {
  const token = authToken.get();

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-silo": window.__SILO__ || "BF",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      credentials: "include"
    });
  } catch (err) {
    console.error("❌ NETWORK ERROR:", err);
    throw new Error("Network failure");
  }

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    console.error("❌ INVALID JSON RESPONSE");
    throw new Error("Invalid API response");
  }

  if (!res.ok) {
    console.error("❌ API ERROR:", json);
    throw new Error(json?.message || "API request failed");
  }

  if (json?.status === "ok") {
    const payload = json.data ?? json;
    assertSilo(payload);
    return payload;
  }

  throw new Error("Invalid API response");
}
