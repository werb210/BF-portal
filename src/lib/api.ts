const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error("VITE_API_URL is not set");
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
}

export { API_BASE };
