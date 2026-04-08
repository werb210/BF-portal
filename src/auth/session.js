const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token";
export function getToken() {
    if (typeof window === "undefined")
        return null;
    return localStorage.getItem(STORAGE_KEY);
}
export function setToken(token) {
    if (typeof window === "undefined")
        return;
    localStorage.setItem(STORAGE_KEY, token);
}
export function clearToken() {
    if (typeof window === "undefined")
        return;
    localStorage.removeItem(STORAGE_KEY);
}
