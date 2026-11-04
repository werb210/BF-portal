// BF_PORTAL_v823_PUSH - the iPad app's ordinary notification token goes to BF-Server (POST /api/staff/push-token,
// app "portal-ios"), so the iPad gets the same alerts as the iPhone dialer: missed calls, voicemail, client
// messages, texts, Maya handoffs and tasks due (BF-Server v823). Before this the token was thrown away and only
// incoming calls (VoIP) reached the iPad. Removed again when the signed-in shell goes away.
// BF_ANDROID_STAFF_v1 - the Android staff app sends its FCM token the same way as app "portal-android"; BF-Server
// delivers the same alerts to it through Firebase (data-only, drawn by PortalMessagingService).
import { Capacitor } from "@capacitor/core";
import { api } from "@/api";

export const PORTAL_PUSH_APP = "portal-ios" as const;
export const PORTAL_PUSH_APP_ANDROID = "portal-android" as const;
export type PortalPushApp = typeof PORTAL_PUSH_APP | typeof PORTAL_PUSH_APP_ANDROID;

let registered: string | null = null;

export function isApnsToken(token: unknown): token is string {
  return typeof token === "string" && /^[0-9a-f]{32,200}$/i.test(token.trim());
}

/** An FCM registration token (letters, digits, "-", "_" and ":"; about 150-200 characters). */
export function isFcmToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_:-]{100,4096}$/.test(token.trim());
}

function platformNow(): string {
  try { return Capacitor.getPlatform(); } catch { return "web"; }
}

/** TestFlight / App Store builds hold production tokens; BF-Server retries the other Apple host when needed. */
export function pushTokenBody(token: string, platform: string = "ios"): { token: string; app: PortalPushApp; environment: "production" } {
  return { token: token.trim(), app: platform === "android" ? PORTAL_PUSH_APP_ANDROID : PORTAL_PUSH_APP, environment: "production" };
}

export async function registerPortalPushToken(token: string): Promise<boolean> {
  const platform = platformNow();
  if (platform === "android" ? !isFcmToken(token) : !isApnsToken(token)) return false;
  try {
    await api.post("/api/staff/push-token", pushTokenBody(token, platform));
    registered = token.trim();
    return true;
  } catch {
    return false; // sent again at the next app start
  }
}

export async function unregisterPortalPushToken(): Promise<void> {
  const token = registered;
  registered = null;
  if (!token) return;
  try {
    await api("/api/staff/push-token", { method: "DELETE", body: { token } });
  } catch {
    // Signed out already; the next person to sign in on this iPad takes the token over.
  }
}
