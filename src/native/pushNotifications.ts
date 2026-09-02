import { Capacitor } from "@capacitor/core";
import { PushNotifications, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";
import type { PluginListenerHandle } from "@capacitor/core";

export type PushRegistrationState = "unsupported" | "denied" | "registered" | "error";
export type PushRegistrationResult = { state: PushRegistrationState; token?: string; error?: string };
export type PushSetup = { result: PushRegistrationResult; remove: () => Promise<void> };

/**
 * The token callback is the device-registration adapter boundary. No server
 * endpoint currently exists, so callers must not upload or persist tokens yet.
 */
export async function registerPushNotifications(
  onOpenUrl: (url: string) => void,
  onToken?: (token: string) => void,
): Promise<PushSetup> {
  if (!Capacitor.isNativePlatform()) return { result: { state: "unsupported" }, remove: async () => undefined };
  const handles: PluginListenerHandle[] = [];
  const remove = async () => { await Promise.all(handles.map((handle) => handle.remove())); };
  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return { result: { state: "denied" }, remove };

    const result = await new Promise<PushRegistrationResult>((resolve) => {
      let settled = false;
      const finish = (value: PushRegistrationResult) => { if (!settled) { settled = true; resolve(value); } };
      void PushNotifications.addListener("registration", (token: Token) => {
        onToken?.(token.value);
        finish({ state: "registered", token: token.value });
      }).then((handle) => handles.push(handle));
      void PushNotifications.addListener("registrationError", (error: unknown) =>
        finish({ state: "error", error: error instanceof Error ? error.message : String(error) })
      ).then((handle) => handles.push(handle));
      void PushNotifications.addListener("pushNotificationReceived", (_notification: PushNotificationSchema) => undefined)
        .then((handle) => handles.push(handle));
      void PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const url = notification.data?.url ?? notification.data?.deepLink;
        if (typeof url === "string") onOpenUrl(url);
      }).then((handle) => handles.push(handle));
      void PushNotifications.register();
      window.setTimeout(() => finish({ state: "error", error: "Timed out waiting for native push registration." }), 15000);
    });
    return { result, remove };
  } catch (error) {
    await remove();
    return { result: { state: "error", error: error instanceof Error ? error.message : String(error) }, remove: async () => undefined };
  }
}
