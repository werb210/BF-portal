import { api } from "@/api";

let refreshing: Promise<void> | null = null;

export async function withO365Refresh<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status;
    if (status !== 401) throw e;
    if (!refreshing) {
      refreshing = (async () => {
        try {
          await api.post("/api/users/me/o365-refresh", {});
        } finally {
          refreshing = null;
        }
      })();
    }
    await refreshing;
    return await call();
  }
}
