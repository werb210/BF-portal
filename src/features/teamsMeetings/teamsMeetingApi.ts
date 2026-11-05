// BF_PORTAL_v888_TEAMS_IN_APP - ask BF-Server for an Azure Communication Services token to join one
// Teams meeting inside the portal. Always BF-Server (meetings live there for every silo).
import { apiForSilo } from "@/api";
import { msalClient } from "@/auth/msal";

// BF_PORTAL_v890_TEAMS_IDENTITY - staff join as themselves (their Teams name, no lobby) when Microsoft gives the portal
// a token for Azure Communication Services. Silent only: no sign-in window opens just for this. If it is not
// available (the permission has not been granted yet), the server lets them join as a named guest, as before.
export const ACS_TEAMS_SCOPES = [
  "https://auth.msft.communication.azure.com/Teams.ManageCalls",
  "https://auth.msft.communication.azure.com/Teams.ManageChats",
];

export async function teamsIdentityToken(client: { getActiveAccount: () => unknown; getAllAccounts: () => unknown[]; acquireTokenSilent: (r: any) => Promise<{ accessToken?: string }> } = msalClient as any): Promise<string | null> {
  try {
    const account = client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
    if (!account) return null;
    const r = await client.acquireTokenSilent({ account, scopes: ACS_TEAMS_SCOPES });
    return r?.accessToken ? String(r.accessToken) : null;
  } catch {
    return null;
  }
}

export type MeetingRef = { joinUrl: string; meetingId?: string | null; calendarEventId?: string | null };
export type MeetingTicket = { token: string; expiresOn: string; acsUserId: string; displayName: string; joinUrl: string; subject: string | null; startsAt: string | null; identity?: "teams" | "guest" };
export type TicketResult = { ok: true; ticket: MeetingTicket } | { ok: false; message: string; joinUrl: string };

export function isTeamsJoinUrl(url: unknown): url is string {
  return typeof url === "string" && /^https:\/\/teams\.(microsoft|live)\.com\/(l\/meetup-join|meet)\//i.test(url.trim());
}

const FALLBACK = "We couldn't start the meeting in the portal. Use Open in Teams instead.";

export async function requestMeetingTicket(ref: MeetingRef): Promise<TicketResult> {
  const body: Record<string, string> = { joinUrl: ref.joinUrl };
  if (ref.meetingId) body.meetingId = ref.meetingId;
  if (ref.calendarEventId) body.calendarEventId = ref.calendarEventId;
  const teamsToken = await teamsIdentityToken(); // BF_PORTAL_v890_TEAMS_IDENTITY
  if (teamsToken) body.teamsToken = teamsToken;
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
