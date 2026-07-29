import { useEffect } from "react";
import { api } from "@/api";

// BF_PORTAL_PUSH_AUTOREGISTER_v1
type PushSubscriptionJson = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export const decodeVapidPublicKey = (value: string): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const key = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) key[index] = raw.charCodeAt(index);
  return key;
};

const keysMatch = (current: ArrayBuffer | ArrayBufferView | null, expected: Uint8Array): boolean => {
  if (!current) return false;
  const bytes = ArrayBuffer.isView(current)
    ? new Uint8Array(current.buffer, current.byteOffset, current.byteLength)
    : new Uint8Array(current);
  return bytes.length === expected.length && bytes.every((byte, index) => byte === expected[index]);
};

const deviceType = (): "mobile" | "desktop" =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";

export async function registerExistingPushPermission(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) return;

  const response = await api.get<{ publicKey?: string | null }>("/api/pwa/vapid-public-key");
  const publicKey = ((response as { data?: { publicKey?: string | null } }).data ?? response).publicKey;
  if (!publicKey) return;

  const registration = await navigator.serviceWorker.ready;
  const expectedKey = decodeVapidPublicKey(publicKey);
  let subscription = await registration.pushManager.getSubscription();

  // A subscription belongs to the VAPID key used to mint it. Reusing one after
  // a key rotation appears successful locally but the push service rejects sends.
  if (subscription && !keysMatch(subscription.options.applicationServerKey, expectedKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expectedKey,
  });

  const json = subscription.toJSON() as PushSubscriptionJson;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
  await api.post("/api/pwa/subscribe", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    deviceType: deviceType(),
  });
}

/** Silently refreshes push registration on each authenticated application load. */
export function usePushRegistration(authenticated: boolean): void {
  useEffect(() => {
    if (!authenticated) return;
    // Registration is best-effort. Permission prompts remain exclusively tied to
    // the user-operated CTA and failures must not prevent the application loading.
    void registerExistingPushPermission().catch(() => undefined);
  }, [authenticated]);
}
