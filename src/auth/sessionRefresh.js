import { api } from "@/utils/api";
import { clearToken, setToken } from "@/auth/token";
let refreshing = false;
export async function refreshSession() {
    if (refreshing)
        return false;
    refreshing = true;
    try {
        const res = await api("/api/auth/refresh", {
            method: "POST",
        });
        const token = res.token;
        if (!token) {
            throw new Error("INVALID_REFRESH");
        }
        setToken(token);
        refreshing = false;
        return true;
    }
    catch {
        clearToken();
        refreshing = false;
        return false;
    }
}
