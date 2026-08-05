// BF_PORTAL_WIDGET_SNAPSHOT_v13
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above const declarations, so the doubles have to be
// created inside vi.hoisted() or the factory closes over a TDZ binding.
const h = vi.hoisted(() => ({
  isNative: vi.fn(() => true),
  setItem: vi.fn(async () => {}),
  reloadTimelines: vi.fn(async () => {}),
  apiFn: vi.fn(),
  fetchTasks: vi.fn(),
  fetchLocalEvents: vi.fn(),
}));
const { isNative, setItem, reloadTimelines, apiFn, fetchTasks, fetchLocalEvents } = h;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.isNative() },
  registerPlugin: () => ({
    setItem: h.setItem,
    reloadTimelines: h.reloadTimelines,
    reloadAllTimelines: vi.fn(),
  }),
}));
vi.mock("@/api", () => ({ api: (...a: unknown[]) => h.apiFn(...a) }));
vi.mock("@/api/tasks", () => ({ fetchTasks: () => h.fetchTasks() }));
vi.mock("@/api/calendar", () => ({ fetchLocalEvents: () => h.fetchLocalEvents() }));

import { APP_GROUP, buildSnapshot, publishWidgetSnapshot, WIDGET_KIND } from "../widgetSnapshot";

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

beforeEach(() => {
  isNative.mockReturnValue(true);
  setItem.mockClear();
  reloadTimelines.mockClear();
  apiFn.mockResolvedValue({ items: [
    { id: "1", name: "A", pipeline_state: "in_review" },
    { id: "2", name: "B", pipeline_state: "funded" },
    { id: "3", name: "C", pipeline_state: "New" },
  ] });
  fetchTasks.mockResolvedValue([
    { id: "t1", title: "due today", status: "open", dueDate: iso(60_000), priority: "normal" },
    { id: "t2", title: "done today", status: "done", dueDate: iso(60_000), priority: "normal" },
    { id: "t3", title: "next week", status: "open", dueDate: iso(7 * 86_400_000), priority: "normal" },
  ]);
  fetchLocalEvents.mockResolvedValue([
    { id: "e1", title: "later", start: iso(3 * 3_600_000), end: iso(4 * 3_600_000) },
    { id: "e2", title: "soon", start: iso(3_600_000), end: iso(2 * 3_600_000) },
    { id: "e3", title: "past", start: iso(-3_600_000), end: iso(-1_000) },
    { id: "e4", title: "third", start: iso(5 * 3_600_000), end: iso(6 * 3_600_000) },
  ]);
});

describe("widget snapshot", () => {
  it("counts only applications that still need attention", async () => {
    const s = await buildSnapshot("BF");
    expect(s.applications).toBe(2); // funded is terminal
  });

  it("counts only open tasks due today", async () => {
    const s = await buildSnapshot("BF");
    expect(s.tasksDueToday).toBe(1);
  });

  it("takes the next two upcoming events in order, dropping past ones", async () => {
    const s = await buildSnapshot("BF");
    expect(s.events.map((e) => e.title)).toEqual(["soon", "later"]);
  });

  it("stamps the silo and a capture time so the widget never implies live data", async () => {
    const s = await buildSnapshot("BI");
    expect(s.silo).toBe("BI");
    expect(Number.isNaN(new Date(s.capturedAt).getTime())).toBe(false);
  });

  it("degrades one number rather than losing the snapshot when a source fails", async () => {
    fetchLocalEvents.mockRejectedValue(new Error("Graph down"));
    const s = await buildSnapshot("BF");
    expect(s.events).toEqual([]);
    expect(s.applications).toBe(2);
  });

  it("writes to the App Group suite and reloads only our widget kind", async () => {
    await publishWidgetSnapshot("BF");
    expect(setItem).toHaveBeenCalledWith(expect.objectContaining({ group: APP_GROUP, key: "summary" }));
    expect(reloadTimelines).toHaveBeenCalledWith({ ofKind: WIDGET_KIND });
  });

  it("does nothing at all on web", async () => {
    isNative.mockReturnValue(false);
    expect(await publishWidgetSnapshot("BF")).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("never throws when the bridge plugin is absent", async () => {
    setItem.mockRejectedValueOnce(new Error("plugin not implemented"));
    expect(await publishWidgetSnapshot("BF")).toBe(false);
  });
});
