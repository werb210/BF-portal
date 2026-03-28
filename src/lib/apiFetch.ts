import { API_BASE_URL } from "@/config/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (path.startsWith('/api')) {
    throw new Error('Remove /api prefix');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}


export default apiFetch;
