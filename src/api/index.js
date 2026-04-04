import { getAuthToken } from '@/lib/authToken';
import { ApiError } from '@/api/http';
import { apiFetch } from '@/api/client';
const API_BASE = import.meta.env.VITE_API_URL;
function requiresAuth(path) {
    return !path.includes('/auth/');
}
function withQuery(path, params) {
    if (!params)
        return path;
    const url = new URL(path, API_BASE);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    });
    return `${url.pathname}${url.search}`;
}
function parsePayload(json) {
    if (json && typeof json === 'object') {
        if ('data' in json) {
            return json.data;
        }
        if (json.status === 'error') {
            if (json.error === 'DB_NOT_READY') {
                return { degraded: true };
            }
            throw new Error(json.error || 'API error');
        }
    }
    return json;
}
export async function rawApiFetch(path, options = {}) {
    const token = getAuthToken();
    if (!token && requiresAuth(path)) {
        throw new Error('Auth token missing');
    }
    const headers = {
        ...options.headers,
    };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const requestPath = withQuery(path, options.params);
    const body = options.body && !(options.body instanceof FormData)
        ? typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body)
        : options.body;
    return fetch(`${API_BASE}${requestPath}`, {
        ...options,
        headers,
        credentials: 'include',
        body,
    });
}
async function request(path, options = {}) {
    const res = await rawApiFetch(path, options);
    if (!res.ok) {
        const text = await res.text();
        throw new ApiError({ status: res.status, message: text || `API error ${res.status}` });
    }
    const json = await res.json();
    return parsePayload(json);
}
export async function apiFetchWithRetry(path, options = {}, retries = 1) {
    try {
        const data = await apiFetch(path, options);
        return { success: true, data };
    }
    catch (error) {
        if (error instanceof TypeError) {
            return { success: false, error: error.message };
        }
        if (retries > 0) {
            return apiFetchWithRetry(path, options, retries - 1);
        }
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
const apiImpl = (async (path, options = {}) => request(path, options));
apiImpl.get = (path, options = {}) => request(path, { ...options, method: 'GET' });
apiImpl.getList = (path, options = {}) => request(path, { ...options, method: 'GET' });
apiImpl.post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body: body });
apiImpl.patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body: body });
apiImpl.put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body: body });
apiImpl.delete = (path, options = {}) => request(path, { ...options, method: 'DELETE' });
export const api = apiImpl;
export const http = apiImpl;
export const apiPost = apiImpl.post;
let lenderConfig = {};
export function configureLenderApiClient(config) {
    lenderConfig = config;
}
function lenderHeaders() {
    const nextTokens = lenderConfig.tokenProvider?.();
    return nextTokens?.accessToken ? { Authorization: `Bearer ${nextTokens.accessToken}` } : undefined;
}
export const lenderApiClient = {
    get: apiImpl.get,
    getList: apiImpl.getList,
    post: (path, body) => apiImpl.post(path, body, {
        headers: lenderHeaders(),
    }),
    patch: (path, body) => apiImpl.patch(path, body, {
        headers: lenderHeaders(),
    }),
    delete: apiImpl.delete,
};
export { ApiError };
export default apiImpl;
