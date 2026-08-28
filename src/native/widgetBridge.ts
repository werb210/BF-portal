import { Capacitor, registerPlugin } from "@capacitor/core";

export const WIDGET_GROUP = "group.com.boreal.portal";
export const WIDGET_SILO_KEY = "widget_active_silo";

export interface WidgetBridge {
  setItem(options: { group: string; key: string; value: string }): Promise<void>;
  removeItem(options: { group: string; key: string }): Promise<void>;
  getItem(options: { group: string; key: string }): Promise<{ value: string | null }>;
  reloadAllTimelines(): Promise<void>;
  reloadTimelines(options: { ofKind: string }): Promise<void>;
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
