import { getAuthToken } from '@/lib/authToken';
import { ApiError } from '@/api/http';
import { setApiStatus } from '@/state/apiStatus';
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
                setApiStatus('degraded');
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
        let text = 'Unknown error';
        if (typeof res.text === 'function') {
            text = await res.text();
        }
        else if (typeof res.json === 'function') {
            const data = await res.json();
            text = typeof data === 'string' ? data : JSON.stringify(data);
        }
        if (res.status === 401) {
            throw new Error('Unauthorized');
        }
        throw new Error(`API error ${res.status}`);
    }
    const json = await res.json();
    return parsePayload(json);
}
export async function apiFetchWithRetry(path, options = {}, retries = 1) {
    try {
        return await apiFetch(path, options);
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
export async function apiFetch(path, options = {}) {
    const data = await request(path, options);
    return { success: true, data };
}
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
