// BF_PORTAL_v888_TEAMS_IN_APP - ask BF-Server for an Azure Communication Services token to join one
// Teams meeting inside the portal. Always BF-Server (meetings live there for every silo).
import { apiForSilo } from "@/api";
import { msalClient } from "@/auth/msal";
import { Capacitor } from "@capacitor/core";
import { isIOSSafari } from "@/auth/msalLoginStrategy";

// BF_PORTAL_v890_TEAMS_IDENTITY - staff join as themselves (their Teams name, no lobby) when Microsoft gives the portal
// a token for Azure Communication Services. Silent only: no sign-in window opens just for this. If it is not
// available (the permission has not been granted yet), the server lets them join as a named guest, as before.
export const ACS_TEAMS_SCOPES = [
  "https://auth.msft.communication.azure.com/Teams.ManageCalls",
  "https://auth.msft.communication.azure.com/Teams.ManageChats",
];

type TeamsMsalClient = {
  initialize?: () => Promise<void>;
  getActiveAccount: () => unknown;
  getAllAccounts: () => unknown[];
  setActiveAccount?: (a: any) => void;
  acquireTokenSilent: (r: any) => Promise<{ accessToken?: string }>;
  acquireTokenPopup?: (r: any) => Promise<{ accessToken?: string; account?: unknown }>;
  acquireTokenRedirect?: (r: any) => Promise<void>;
};

// BF_PORTAL_TEAMS_IPAD_SIGNIN_v1 - the iPad app (and Safari on iPhone/iPad) cannot open Microsoft's sign-in popup, so
// the Join click fell back to joining as a guest and Teams put staff in the lobby. There the sign-in goes by redirect:
// the join is remembered, Microsoft signs the person in, and on return the meeting opens again with their own token.
export const PENDING_JOIN_KEY = "bf_teams_pending_join";
const REDIRECT_GUARD_MS = 10 * 60 * 1000;
export function popupUnusable(): boolean {
  try { if (Capacitor.isNativePlatform()) return true; } catch { /* not native */ }
  return isIOSSafari();
}
export type PendingJoin = { joinUrl: string; meetingId?: string | null; calendarEventId?: string | null; at: number };
export function readPendingJoin(now = Date.now()): PendingJoin | null {
  try {
    try { if (Capacitor.isNativePlatform()) { sessionStorage.removeItem(PENDING_JOIN_KEY); return null; } } catch { /* not native */ } // BF_PORTAL_TEAMS_NATIVE_NO_SIGNIN_v1
    const raw = sessionStorage.getItem(PENDING_JOIN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingJoin;
    return p && typeof p.joinUrl === "string" && now - Number(p.at) < REDIRECT_GUARD_MS ? p : null;
  } catch { return null; }
}
export function clearPendingJoin(): void { try { sessionStorage.removeItem(PENDING_JOIN_KEY); } catch { /* ignore */ } }

// BF_PORTAL_v962_TEAMS_JOIN_AS_YOURSELF - "silent only" left the organiser in the Teams lobby as a guest whenever
// the tab had no Microsoft session (they are kept per tab) or Microsoft wanted the permission confirmed once. With
// `interactive` (the Join meeting click) a Microsoft window is shown in that case, so staff join as themselves. Every
// miss is written to the console with its reason instead of being swallowed.
// BF_PORTAL_v963_TEAMS_USER_ID - the Microsoft user id goes with the token: the server cannot always read the token
// itself, and Azure Communication Services needs to know whose it is (it verifies the token against that id).
const oidOf = (a: unknown): string => {
  const x = a as { localAccountId?: unknown; idTokenClaims?: { oid?: unknown } } | null;
  const v = String(x?.idTokenClaims?.oid ?? x?.localAccountId ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(v) ? v : "";
};
let lastTeamsUserId = "";
export const teamsUserId = (): string => lastTeamsUserId;

const isNativeApp = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export async function teamsIdentityToken(client: TeamsMsalClient = msalClient as any, opts: { interactive?: boolean; join?: Omit<PendingJoin, "at"> } = {}): Promise<string | null> {
  let account: unknown = null;
  try {
    if (client.initialize) await client.initialize();
    account = client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
    if (!account) throw new Error("no_account");
    const r = await Promise.race([
      client.acquireTokenSilent({ account, scopes: ACS_TEAMS_SCOPES }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("silent_timeout")), 8000)),
    ]);
    if (r?.accessToken) { lastTeamsUserId = oidOf((r as { account?: unknown }).account) || oidOf(account); return String(r.accessToken); }
    throw new Error("no_access_token");
  } catch (err) {
    const why = (err as { errorCode?: string; message?: string } | null)?.errorCode || (err as Error | null)?.message || String(err);
    // BF_PORTAL_TEAMS_NATIVE_NO_SIGNIN_v1 (2026-11-22) - in the iPad / Mac app a Microsoft sign-in leaves the app:
    // the sign-in page opens in Safari and Microsoft returns to the website, not the app (Todd: "it opened up the portal
    // in the browser"). The server joins staff with their stored Microsoft sign-in instead (BF-Server #3546), so the
    // app never asks for one.
    try {
      if (Capacitor.isNativePlatform()) {
        console.warn("[teams-in-app] app: no Microsoft sign-in here; the server uses the stored sign-in", { reason: why });
        return null;
      }
    } catch { /* not native */ }
    if (opts.interactive && popupUnusable() && client.acquireTokenRedirect && opts.join) {
      // One redirect per meeting per 10 minutes, so a refused sign-in cannot loop.
      const before = readPendingJoin();
      if (before && before.joinUrl === opts.join.joinUrl) {
        console.warn("[teams-in-app] Microsoft sign-in by redirect already tried; joining as a guest", { reason: why });
        return null;
      }
      try {
        sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify({ ...opts.join, at: Date.now() }));
        await client.acquireTokenRedirect({ scopes: ACS_TEAMS_SCOPES, account: account ?? undefined });
        return null; // the page navigates to Microsoft; the join resumes on return
      } catch (redirectErr) {
        clearPendingJoin();
        console.warn("[teams-in-app] Microsoft sign-in by redirect failed; joining as a guest", { reason: why, redirect: (redirectErr as Error | null)?.message || String(redirectErr) });
        return null;
      }
    }
    if (!opts.interactive || !client.acquireTokenPopup) {
      console.warn("[teams-in-app] no Microsoft token for Teams; joining as a guest", { reason: why });
      return null;
    }
    try {
      const r = await client.acquireTokenPopup({ scopes: ACS_TEAMS_SCOPES, account: account ?? undefined });
      if (!account && r?.account && client.setActiveAccount) client.setActiveAccount(r.account);
      if (r?.accessToken) { lastTeamsUserId = oidOf(r.account) || oidOf(account); return String(r.accessToken); }
      console.warn("[teams-in-app] Microsoft sign-in returned no token; joining as a guest", { reason: why });
      return null;
    } catch (popupErr) {
      console.warn("[teams-in-app] Microsoft sign-in for Teams failed; joining as a guest", { reason: why, popup: (popupErr as { errorCode?: string; message?: string } | null)?.errorCode || (popupErr as Error | null)?.message || String(popupErr) });
      return null;
    }
  }
}

export type MeetingRef = { joinUrl: string; meetingId?: string | null; calendarEventId?: string | null };
export type MeetingTicket = { token: string; expiresOn: string; acsUserId: string; displayName: string; joinUrl: string; subject: string | null; startsAt: string | null; identity?: "teams" | "guest" };
export type TicketResult = { ok: true; ticket: MeetingTicket } | { ok: false; message: string; joinUrl: string };

export function isTeamsJoinUrl(url: unknown): url is string {
  return typeof url === "string" && /^https:\/\/teams\.(microsoft|live)\.com\/(l\/meetup-join|meet)\//i.test(url.trim());
}

const FALLBACK = "We couldn't start the meeting in the portal. Use Open in Teams instead.";

// BF_PORTAL_v963_NO_WEBRTC - the iPad app running on a Mac has no in-app video at all ("Can't find variable:
// MediaStream" took the whole screen down). Say so and offer Teams instead of starting a call that cannot work.
export function inAppVideoSupported(g: { MediaStream?: unknown; RTCPeerConnection?: unknown } = globalThis as any): boolean {
  return typeof g.MediaStream !== "undefined" && typeof g.RTCPeerConnection !== "undefined";
}

export async function requestMeetingTicket(ref: MeetingRef): Promise<TicketResult> {
  if (!inAppVideoSupported()) return { ok: false, message: "Video meetings can't run inside this app on this device. Use Open in Teams instead.", joinUrl: ref.joinUrl };
  const body: Record<string, string> = { joinUrl: ref.joinUrl };
  if (ref.meetingId) body.meetingId = ref.meetingId;
  if (ref.calendarEventId) body.calendarEventId = ref.calendarEventId;
  const teamsToken = await teamsIdentityToken(undefined, { interactive: true, join: { joinUrl: ref.joinUrl, meetingId: ref.meetingId ?? null, calendarEventId: ref.calendarEventId ?? null } }); // BF_PORTAL_v890_TEAMS_IDENTITY + v962: asked from the Join click
  if (!teamsToken && readPendingJoin()?.joinUrl === ref.joinUrl && popupUnusable() && !isNativeApp()) {
    // A redirect to Microsoft is under way (or was just tried): don't join as a guest in the meantime.
    const pending = readPendingJoin();
    if (pending && Date.now() - pending.at < 5000) return { ok: false, message: "Signing you in to Microsoft...", joinUrl: ref.joinUrl };
  }
  if (teamsToken) { body.teamsToken = teamsToken; if (teamsUserId()) body.teamsUserId = teamsUserId(); }
  try {
    const t = await apiForSilo("BF")<MeetingTicket>("/api/meetings/acs-token", { method: "POST", body });
    if (!t || typeof t.token !== "string" || !t.token) return { ok: false, message: FALLBACK, joinUrl: ref.joinUrl };
    return { ok: true, ticket: t };
  } catch (err) {
    const details = (err as { details?: { message?: unknown; joinUrl?: unknown } } | null)?.details;
    const message = typeof details?.message === "string" && details.message ? details.message : FALLBACK;
    const joinUrl = isTeamsJoinUrl(details?.joinUrl) ? details!.joinUrl as string : ref.joinUrl;
    return { ok: false, message, joinUrl };
  }
}
