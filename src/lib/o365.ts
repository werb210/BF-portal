import { api } from "@/api";
import { setApiStatus } from "@/state/apiStatus";
import { shouldLogoutOn401 } from "@/lib/apiAuth";

/**
 * Called from app boot.
 */
export async function refreshO365TokenIfPossible(): Promise<void> {
  try {
    const status = await api.get<{ connected: boolean; canRefresh?: boolean; email?: string }>("/api/users/me/o365-status");
    if (status?.connected && status?.canRefresh) {
      await api.post("/api/users/me/o365-refresh", {});
    }
  } catch (e: any) {
    const url = e?.details?.url ?? "/api/users/me/o365-status";
    const status = e?.status ?? e?.response?.status;
    if (status === 401 && shouldLogoutOn401(url)) {
      window.location.href = "/login";
      return;
    }
    if (status === 401) {
      setApiStatus("degraded");
      console.warn("[api] non-session 401 from", url, "— not logging out");
      return;
    }
    if (status >= 500) {
      console.warn("Microsoft 365 status degraded");
    }
  }
}
