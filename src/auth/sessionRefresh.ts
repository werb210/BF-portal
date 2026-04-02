import { api } from "@/utils/api";
import { clearToken, setToken } from "@/auth/token";

let refreshing = false;

export async function refreshSession(): Promise<boolean> {
  if (refreshing) return false;
  refreshing = true;

  try {
    const res = await api<{ token: string }>("/api/auth/refresh", {
      method: "POST",
    });

    if (!res.success) {
      const message = "error" in res ? res.error.message : "INVALID_REFRESH";
      throw new Error(message || "INVALID_REFRESH");
    }

    const token = res.data.token;
    if (!token) {
      throw new Error("INVALID_REFRESH");
    }

    setToken(token);
    refreshing = false;
    return true;
  } catch {
    clearToken();
    refreshing = false;
    return false;
  }
}
