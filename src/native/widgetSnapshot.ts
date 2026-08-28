import { Capacitor } from "@capacitor/core";
import { api } from "@/api";
import { WidgetBridgePlugin, WIDGET_GROUP } from "@/native/widgetBridge";

export const WIDGET_KIND = "BorealPortalSummary";
export const WIDGET_SILOS = ["BF", "BI", "SLF"] as const;
const SUMMARY_KEYS = {
  BF: "widget_summary_BF",
  BI: "widget_summary_BI",
  SLF: "widget_summary_SLF",
} as const;

export type WidgetSilo = (typeof WIDGET_SILOS)[number];

export type WidgetSummary = {
  silo: WidgetSilo;
  pipelineCount: number;
  tasksDueToday: number;
  unreadMessages: number;
  commissionEarned: number;
  currency: string;
  asOf: string;
};

/** Publish every summary the signed-in user can access. */
export async function publishWidgetSnapshot(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;

  const results = await Promise.allSettled(
    WIDGET_SILOS.map(async (silo) => {
      const summary = await api<WidgetSummary>("/api/widget/summary", {
        headers: { "X-Silo": silo },
      });
      await WidgetBridgePlugin.setItem({
        group: WIDGET_GROUP,
        key: SUMMARY_KEYS[silo],
        value: JSON.stringify(summary),
      });
    }),
  );

  const wroteSnapshot = results.some((result) => result.status === "fulfilled");
  if (wroteSnapshot) {
    try {
      await WidgetBridgePlugin.reloadAllTimelines();
    } catch {
      // A timeline reload is best-effort; the persisted snapshots remain useful.
    }
  }
  return wroteSnapshot;
}
