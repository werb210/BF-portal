const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export { API_BASE };
