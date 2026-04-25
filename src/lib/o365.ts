import { api } from "@/api";

/**
 * Called from app boot. If the user has previously connected M365 and
 * the server has a refresh_token, this triggers a refresh (server-side
 * only) so subsequent /api/crm/inbox calls have a fresh access token
 * without prompting the user.
 */
export async function refreshO365TokenIfPossible(): Promise<void> {
  try {
    const status = await api.get<{ connected: boolean; canRefresh: boolean }>(
      "/api/users/me/o365-status",
    );
    if (status?.connected && status?.canRefresh) {
      await api.post("/api/users/me/o365-refresh", {});
    }
  } catch {
    /* ignore — user just continues unauthenticated */
  }
}
