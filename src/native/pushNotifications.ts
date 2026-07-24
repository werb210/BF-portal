import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";

export type PushRegistrationState = "unsupported" | "denied" | "registered" | "error";
export type PushRegistrationResult = { state: PushRegistrationState; token?: string; error?: string };

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  if (!Capacitor.isNativePlatform()) return { state: "unsupported" };
  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return { state: "denied" };
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (result: PushRegistrationResult) => { if (!settled) { settled = true; resolve(result); } };
      void PushNotifications.addListener("registration", (token: Token) => finish({ state: "registered", token: token.value }));
      void PushNotifications.addListener("registrationError", (error: unknown) => finish({ state: "error", error: error instanceof Error ? error.message : String(error) }));
      void PushNotifications.addListener("pushNotificationReceived", (_notification: PushNotificationSchema) => undefined);
      void PushNotifications.addListener("pushNotificationActionPerformed", (_action: ActionPerformed) => undefined);
      void PushNotifications.register();
      setTimeout(() => finish({ state: "error", error: "Timed out waiting for APNs registration." }), 15000);
    });
  } catch (error) {
    return { state: "error", error: error instanceof Error ? error.message : String(error) };
  }
}
