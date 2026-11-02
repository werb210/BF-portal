// BF_PORTAL_v875_SSO (ported from KS-Portal auth/sso.ts, Microsoft only) - "Sign in with Microsoft" for staff. The sign-in
// page asks the server whether it is switched on (GET /api/auth/sso/config, public). The button is a full-page
// navigation to the server's /start, which goes to Microsoft and back to the server's callback; the server then
// returns here with a one-time code in the URL fragment (#sso_code=...), or ?sso_error=... The code is exchanged once
// (POST /api/auth/sso/exchange) for the same staff session the text-code and passkey sign-ins give (access token and
// refresh token). These calls run before anyone is signed in, so - like the text-code start on this page - they use
// fetch directly.
import { API_BASE } from "@/config/api";
import { setAuthToken } from "@/lib/authToken";
import { captureRefreshToken } from "@/auth/sessionRefresh"; // BF_PORTAL_v868_SLIDING_REFRESH

export type SsoConfig = { microsoft: boolean };
export const SSO_OFF: SsoConfig = { microsoft: false };

/** Whether to show the button. Anything other than a clear answer from the server means no (never a broken button). */
export async function fetchSsoConfig(fetchImpl: typeof fetch = fetch): Promise<SsoConfig> {
  try {
    const res = await fetchImpl(`${API_BASE}/api/auth/sso/config`, { headers: { Accept: "application/json" } });
    if (!res.ok) return SSO_OFF;
    const body = (await res.json()) as Partial<SsoConfig> | null;
    return { microsoft: body?.microsoft === true };
  } catch (err) {
    console.warn("[sso] could not read the sign-in options", err instanceof Error ? err.message : err);
    return SSO_OFF;
  }
}

export function ssoStartUrl(): string {
  return `${API_BASE}/api/auth/sso/microsoft/start`;
}

/** The one-time code from #sso_code=... and the reason from ?sso_error=..., if the server sent us back with one. */
export function readSsoReturn(loc: { hash: string; search: string }): { code: string | null; error: string | null } {
  const hash = new URLSearchParams(loc.hash.replace(/^#/, ""));
  const search = new URLSearchParams(loc.search);
  return { code: hash.get("sso_code"), error: search.get("sso_error") };
}

const SSO_ERROR_TEXT: Record<string, string> = {
  no_user: "That Microsoft account isn't set up as a Boreal staff member. Ask an admin to add your work email to your staff account.",
  not_staff: "That account isn't a staff account. Ask an admin.",
  user_inactive: "This account has been switched off. Ask an admin.",
  ambiguous_email: "More than one staff account uses that email. Ask an admin to fix it.",
  email_not_verified: "Microsoft didn't send an email address for that account. Ask an admin.",
  wrong_tenant: "That Microsoft account belongs to a different organisation. Sign in with your Boreal work account.",
  sso_off: "Sign in with Microsoft isn't switched on. Use your phone number or a passkey instead.",
  provider_error: "Microsoft sign-in was cancelled or didn't finish. Please try again.",
  rate_limited: "Too many sign-in attempts. Wait a few minutes and try again.",
};

export function ssoErrorText(reason: string | null | undefined): string {
  if (!reason) return "";
  return SSO_ERROR_TEXT[reason] ?? "Microsoft sign-in didn't work. Please try again, or use your phone number.";
}

/** Exchanges the one-time code for the session and stores it. Throws with a readable message when it fails. */
export async function exchangeSsoCode(code: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}/api/auth/sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch {
    throw new Error("Couldn't reach the server to finish signing in. Please try again.");
  }
  type ExchangeBody = { data?: { token?: string; refreshToken?: string }; message?: string };
  const body = (await res.json().catch((err: unknown) => {
    console.warn("[sso] sign-in answer was not JSON", err instanceof Error ? err.message : err);
    return null;
  })) as ExchangeBody | null;
  const token = body?.data?.token;
  if (!res.ok || !token) throw new Error(body?.message || "That sign-in link has expired. Please sign in again.");
  setAuthToken(token);
  captureRefreshToken(body);
}
