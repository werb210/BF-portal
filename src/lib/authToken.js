const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token";
export function getAuthToken() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    }
    catch {
        return null;
    }
}
export function setAuthToken(token) {
    try {
        localStorage.setItem(STORAGE_KEY, token);
    }
    catch {
        // fail silently
    }
}
export function clearAuthToken() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch {
        // fail silently
    }
}
export const authToken = {
    get: getAuthToken,
    set: setAuthToken,
    clear: clearAuthToken,
};
export const getToken = getAuthToken;
export const setToken = setAuthToken;
export const clearToken = clearAuthToken;
export const AUTH_STORAGE_KEY = STORAGE_KEY;
