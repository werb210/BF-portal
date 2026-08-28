// BF_PORTAL_WIDGET_SNAPSHOT_v13
// Web half of the iPadOS WidgetKit work. The widget UI itself must be SwiftUI in
// a separate extension target - a Home Screen widget cannot render the React app.
// What it CAN do is read a small JSON snapshot this module writes into a shared
// App Group UserDefaults suite, which is why the widget never needs to
// authenticate and never hits a token-expiry edge case.
//
// Deliberately no npm dependency. The bridge is reached through Capacitor's
// registerPlugin under the name `WidgetBridgePlugin`, which is what
// capacitor-widget-bridge registers itself as on the native side. So this code
// is inert today, and starts working the moment either that plugin or a small
// custom Swift plugin of the same name is added - with no further JS change.
//
// NOTE: @capacitor/preferences' `group` option does NOT work for this. It is only
// a key-name prefix on standard UserDefaults, not a shared App Group suite, so a
// widget extension cannot read it. This is a well-documented trap.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { fetchLocalEvents } from "@/api/calendar";
import { fetchTasks } from "@/api/tasks";
import { api } from "@/api";

export const APP_GROUP = "group.com.boreal.portal";
export const WIDGET_KIND = "BorealPortalSummary";
export const SNAPSHOT_KEY = "summary";

type WidgetBridge = {
  setItem(options: { group: string; key: string; value: string }): Promise<void>;
  reloadAllTimelines(): Promise<void>;
  reloadTimelines(options: { ofKind: string }): Promise<void>;
};

const bridge = registerPlugin<WidgetBridge>("WidgetBridgePlugin");

export type WidgetEvent = { title: string; start: string };

export type WidgetSnapshot = {
  /** Open applications on the pipeline board. */
  applications: number;
  /** Tasks with a due date of today that are not done. */
  tasksDueToday: number;
  /** The next two upcoming calendar events. */
  events: WidgetEvent[];
  /** Which silo the snapshot was taken in - the widget shows one silo at a time. */
  silo: string;
  /** ISO timestamp so the widget can render "as of HH:mm" rather than imply live data. */
  capturedAt: string;
};

type PipelineRow = { id: string; name: string | null; pipeline_state: string };

// Terminal states are excluded so the number means "needs attention", which is
// the only thing worth putting on a Home Screen.
const CLOSED_STATES = new Set(["funded", "declined", "rejected", "closed", "lost", "archived"]);

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export async function buildSnapshot(silo: string): Promise<WidgetSnapshot> {
  // Each source is independently tolerated: one failing endpoint degrades a
  // single number rather than losing the whole snapshot.
  const [pipeline, tasks, events] = await Promise.allSettled([
    api<{ items: PipelineRow[] }>("/api/pipeline"),
    fetchTasks(),
    fetchLocalEvents(),
  ]);

  const applications = pipeline.status === "fulfilled"
    ? (pipeline.value.items ?? []).filter(
        (r) => !CLOSED_STATES.has(String(r.pipeline_state ?? "").toLowerCase()),
      ).length
    : 0;

  const tasksDueToday = tasks.status === "fulfilled"
    ? tasks.value.filter((t) => t.status !== "done" && isToday(t.dueDate)).length
    : 0;

  const now = Date.now();
  const upcoming = events.status === "fulfilled"
    ? [...events.value]
        .filter((e) => {
          const t = new Date(e.start).getTime();
          return !Number.isNaN(t) && t >= now;
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 2)
        .map((e) => ({ title: e.title, start: e.start }))
    : [];

  return {
    applications,
    tasksDueToday,
    events: upcoming,
    silo,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Build and publish the snapshot. Safe to call anywhere: on web, or on native
 * before the widget extension exists, it resolves to false and does nothing.
 */
export async function publishWidgetSnapshot(silo: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const snapshot = await buildSnapshot(silo);
    await bridge.setItem({
      group: APP_GROUP,
      key: SNAPSHOT_KEY,
      value: JSON.stringify(snapshot),
    });
    await bridge.reloadTimelines({ ofKind: WIDGET_KIND });
    return true;
  } catch {
    // No bridge plugin, no App Group yet, or an unauthenticated cold start.
    // A widget that cannot be updated must never break the app it lives beside.
    return false;
  }
}
