import { API_CONTRACT } from '@/contracts';

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error('Missing VITE_API_URL');
}

export function buildUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }
  return `${API_BASE}${path}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = buildUrl(path);

  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}
