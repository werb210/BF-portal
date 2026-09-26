// BF_PORTAL_BLOCK_v556 - Siri Shortcuts + Spotlight, web side.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type SpotlightItem = { route: string; title: string; subtitle?: string };
interface PortalLauncher {
  take(): Promise<{ route: string }>;
  index(options: { items: SpotlightItem[] }): Promise<{ indexed: number }>;
  clearIndex(): Promise<void>;
  addListener(event: "route", cb: (data: { route: string }) => void): Promise<{ remove: () => Promise<void> }>;
}
export const PortalLauncherPlugin = registerPlugin<PortalLauncher>("PortalLauncher");
export const MAYA_EVENT = "boreal:maya-command";
let pendingMaya: string | null = null;

export function launcherAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PortalLauncher");
}
export function parseLaunchRoute(raw: unknown): { path: string } | { maya: string } | null {
  const route = typeof raw === "string" ? raw.trim() : "";
  if (!route) return null;
  if (route.startsWith("maya:")) {
    const maya = route.slice(5).trim();
    return maya ? { maya: maya.slice(0, 500) } : null;
  }
  if (!route.startsWith("/") || route.startsWith("//") || /[\s\\]/.test(route)) return null;
  return { path: route };
}
export function deliverMaya(command: string): void {
  pendingMaya = command;
  window.dispatchEvent(new Event(MAYA_EVENT));
}
export function takePendingMaya(): string | null {
  const command = pendingMaya;
  pendingMaya = null;
  return command;
}
type AppCard = { id?: string; name?: string | null; business_legal_name?: string | null; pipeline_state?: string | null };
export function spotlightItems(cards: AppCard[]): SpotlightItem[] {
  return cards.filter((card) => card?.id && (card.business_legal_name || card.name)).slice(0, 500).map((card) => ({
    route: `/applications/${encodeURIComponent(String(card.id))}`,
    title: String(card.business_legal_name || card.name),
    subtitle: card.pipeline_state ? `Application - ${card.pipeline_state}` : "Application",
  }));
}
