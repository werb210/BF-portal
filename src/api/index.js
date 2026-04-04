import { getStoredToken } from '@/lib/auth';
const API_BASE = import.meta.env.VITE_API_URL;
function requiresAuth(path) {
    return !path.includes('/auth/');
}
export async function api(path, options = {}) {
    const token = getStoredToken();
    if (!token && requiresAuth(path)) {
        throw new Error('Auth token missing');
    }
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
        body: options.body
            ? typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body)
            : undefined,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}
