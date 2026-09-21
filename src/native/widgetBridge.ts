import { Capacitor, registerPlugin } from "@capacitor/core";

export const WIDGET_GROUP = "group.com.boreal.portal";
export const WIDGET_SILO_KEY = "widget_active_silo";

export interface WidgetBridge {
  setItem(options: { group: string; key: string; value: string }): Promise<void>;
  removeItem(options: { group: string; key: string }): Promise<void>;
  getItem(options: { group: string; key: string }): Promise<{ value: string | null }>;
  reloadAllTimelines(): Promise<void>;
  reloadTimelines(options: { ofKind: string }): Promise<void>;
  setWidgetSession(options: { token: string; apiBase: string }): Promise<void>; // v384
  clearWidgetSession(): Promise<void>; // v384
}

// BF_PORTAL_WIDGET_SELF_REFRESH_v384 - hand the app the staff token (kept in the
// app's own Keychain, never the App Group) so it can refresh the widget in the
// background; clear it when signed out.
export async function syncWidgetSession(token: string | null, apiBase: string): Promise<void> {
  if (!isNativeIOS()) return;
  try {
    if (token && apiBase.startsWith("https://")) {
      await WidgetBridgePlugin.setWidgetSession({ token, apiBase });
    } else {
      await WidgetBridgePlugin.clearWidgetSession();
    }
  } catch {
    // Older native builds do not have these methods; the widget still updates on open.
  }
}

export const WidgetBridgePlugin = registerPlugin<WidgetBridge>("WidgetBridgePlugin");

export function isNativeIOS(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export async function mirrorSiloToWidget(silo: string | null): Promise<void> {
  if (!isNativeIOS()) return;
  try {
    if (silo !== null) {
      await WidgetBridgePlugin.setItem({ group: WIDGET_GROUP, key: WIDGET_SILO_KEY, value: silo });
    } else {
      await WidgetBridgePlugin.removeItem({ group: WIDGET_GROUP, key: WIDGET_SILO_KEY });
    }
    await WidgetBridgePlugin.reloadAllTimelines();
  } catch {
    // Widget integration must never block portal state changes.
  }
}
