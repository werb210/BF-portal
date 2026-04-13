import { buildApiUrl } from '@/config/api';

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function api(path: string, options: ApiOptions = {}) {
  const url = buildApiUrl(path);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = localStorage.getItem('auth_token');

  if (options.auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ERROR ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}
