import { api } from "@/api";

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
    const status = e?.status ?? e?.response?.status;
    if (status === 401) {
      window.location.href = "/login";
      return;
    }
    if (status >= 500) {
      console.warn("Microsoft 365 status degraded");
    }
  }
}
