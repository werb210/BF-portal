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

// BF_PORTAL_v789_INCREMENTAL_CONSENT - run a call that needs an extra Microsoft permission
// (Mail.ReadWrite for the inbox, Files.ReadWrite for OneDrive). The permission is fetched silently when
// the user has already granted it; when the server reports it missing and the call came from a click
// (`interactive`), Microsoft's consent popup is shown and the call is retried once.
export async function withO365Scopes<T>(
  scopes: readonly string[],
  call: () => Promise<T>,
  opts: { interactive?: boolean } = {},
): Promise<T> {
  const consent = async (interactive: boolean): Promise<boolean> => {
    try {
      const { ensureO365Scopes } = await import("@/auth/msal");
      return await ensureO365Scopes(scopes, { interactive });
    } catch {
      return false;
    }
  };
  await consent(false);
  try {
    return await withO365Refresh(call);
  } catch (error) {
    const { isO365ConsentError } = await import("@/auth/o365Scopes");
    if (!opts.interactive || !isO365ConsentError(error)) throw error;
    if (!(await consent(true))) throw error;
    return await call();
  }
}
