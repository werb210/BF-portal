import { setToken } from "@/lib/authToken";
const REFRESH_TOKEN_KEY = "staff_refresh_token";
let inMemoryRefreshToken = null;
const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
const readStoredRefreshToken = () => {
    if (!canUseLocalStorage())
        return null;
    try {
        return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }
    catch {
        return null;
    }
};
const writeStoredRefreshToken = (token) => {
    if (!canUseLocalStorage())
        return;
    try {
        if (!token) {
            window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
            return;
        }
        window.sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
    catch {
        // ignore storage errors
    }
};
export const authStore = {
    setTokens(access, refresh) {
        setToken(access);
        inMemoryRefreshToken = refresh;
        writeStoredRefreshToken(refresh);
    },
    getRefreshToken() {
        if (inMemoryRefreshToken)
            return inMemoryRefreshToken;
        const stored = readStoredRefreshToken();
        inMemoryRefreshToken = stored;
        return stored;
    }
};
