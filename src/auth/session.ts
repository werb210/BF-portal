const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token";
const SESSION_EVENT = "bf-session-changed";

export type BfSession = {
  connected: boolean;
  email?: string;
  role?: string;
  raw?: unknown;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  // BF_MSAL_DIAG_v24
  console.log("[msal.diag] auth_token.write", {
    ts: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    tokenLength: token?.length ?? 0
  });
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function bfReadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token") || localStorage.getItem("bf_jwt_token") || getToken();
}

export function bfBroadcastSession(session: BfSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("bf_session", JSON.stringify(session));
    window.dispatchEvent(new CustomEvent<BfSession>(SESSION_EVENT, { detail: session }));
  } catch {
    // noop
  }
}

export function bfReadCachedSession(): BfSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("bf_session");
    return raw ? (JSON.parse(raw) as BfSession) : null;
  } catch {
    return null;
  }
}

export function bfOnSessionChange(handler: (session: BfSession) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    handler((event as CustomEvent<BfSession>).detail);
  };

  window.addEventListener(SESSION_EVENT, listener as EventListener);
  const cached = bfReadCachedSession();
  if (cached) handler(cached);

  return () => {
    window.removeEventListener(SESSION_EVENT, listener as EventListener);
  };
}

export async function bfRehydrateSession(): Promise<BfSession> {
  const token = bfReadToken();
  if (!token) {
    const disconnected: BfSession = { connected: false };
    bfBroadcastSession(disconnected);
    return disconnected;
  }

  const base = import.meta.env.VITE_API_URL || "https://server.boreal.financial";

  try {
    const response = await fetch(`${base}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.warn("[session] /api/auth/me returned", response.status);
      const disconnected: BfSession = { connected: false };
      bfBroadcastSession(disconnected);
      return disconnected;
    }

    const body = await response.json();
    const me = body?.user ?? body?.data ?? body;
    const connected: BfSession = {
      connected: true,
      email: me?.email,
      role: me?.role,
      raw: me,
    };
    console.log("[session] rehydrated", { email: connected.email, role: connected.role });
    bfBroadcastSession(connected);
    return connected;
  } catch (error) {
    console.error("[session] rehydrate failed", error);
    const disconnected: BfSession = { connected: false };
    bfBroadcastSession(disconnected);
    return disconnected;
  }
}
