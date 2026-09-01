import { Capacitor } from "@capacitor/core";
import { api } from "@/api";
import { WidgetBridgePlugin, WIDGET_GROUP } from "@/native/widgetBridge";
import { fetchLocalEvents } from "@/api/calendar";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
import { normalizeStageId } from "@/core/engines/pipeline/pipeline.types";

export const WIDGET_KIND = "BorealPortalSummary";
export const WIDGET_SILOS = ["BF", "BI", "SLF"] as const;
const SUMMARY_KEYS = {
  BF: "widget_summary_BF",
  BI: "widget_summary_BI",
  SLF: "widget_summary_SLF",
} as const;

export type WidgetSilo = (typeof WIDGET_SILOS)[number];

export type WidgetSummary = {
  schemaVersion: 2;
  silo: WidgetSilo;
  pipelineCount: number;
  tasksDueToday: number;
  tasksOverdue: number;
  unreadMessages: number;
  commissionEarned: number;
  currency: string;
  documentsRequired: number;
  additionalStepsRequired: number;
  offersOutstanding: number;
  nextTask: WidgetTask | null;
  nextMeeting: { id: string; title: string; start: string } | null;
  asOf: string;
};

const safeNumber = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

type WidgetTask = { id: string; title: string; type: string; dueAt: string | null; contactName: string | null };
type TaskRow = { id: string; title: string; type: string; due_at?: string | null; dueAt?: string | null; contact_name?: string | null; contactName?: string | null };
const taskRows = (value: unknown): TaskRow[] => {
  const payload = (value as { data?: unknown })?.data ?? value;
  if (Array.isArray(payload)) return payload as TaskRow[];
  return Array.isArray((payload as { tasks?: unknown })?.tasks) ? (payload as { tasks: TaskRow[] }).tasks : [];
};
const taskTime = (task: TaskRow) => task.due_at ?? task.dueAt ?? null;
const orderedTasks = (tasks: TaskRow[]) => [...tasks].sort((a, b) => {
  const left = taskTime(a), right = taskTime(b);
  if (!left) return right ? 1 : 0;
  if (!right) return -1;
  return new Date(left).getTime() - new Date(right).getTime();
});
const toWidgetTask = (task?: TaskRow): WidgetTask | null => task ? ({
  id: String(task.id), title: task.title, type: task.type, dueAt: taskTime(task),
  contactName: task.contact_name ?? task.contactName ?? null,
}) : null;

/** Publish every summary the signed-in user can access. */
export async function publishWidgetSnapshot(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;

  const results = await Promise.allSettled(
    WIDGET_SILOS.map(async (silo) => {
      const summary = await api<Record<string, unknown>>("/api/widget/summary", {
        headers: { "X-Silo": silo },
      });
      const headers = { "X-Silo": silo };
      const [dueResult, overdueResult, pipelineResult, calendarResult] = await Promise.allSettled([
        api<unknown>("/api/tasks?view=due_today", { headers }),
        api<unknown>("/api/tasks?view=overdue", { headers }),
        pipelineApi.fetchPipeline({ businessUnit: silo }),
        fetchLocalEvents({ headers }),
      ]);
      const due = dueResult.status === "fulfilled" ? taskRows(dueResult.value) : [];
      const overdue = overdueResult.status === "fulfilled" ? taskRows(overdueResult.value) : [];
      const applications = pipelineResult.status === "fulfilled" ? pipelineResult.value.applications : [];
      const stageCount = (stage: string) => applications.filter((app) => normalizeStageId(app.stage) === normalizeStageId(stage)).length;
      const meetings = calendarResult.status === "fulfilled" ? calendarResult.value
        .filter((event) => new Date(event.start).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [];
      const next = orderedTasks(overdue)[0] ?? orderedTasks(due)[0];
      const expanded: WidgetSummary = {
        schemaVersion: 2,
        silo,
        pipelineCount: safeNumber(summary.pipelineCount),
        tasksDueToday: safeNumber(summary.tasksDueToday),
        unreadMessages: safeNumber(summary.unreadMessages),
        commissionEarned: safeNumber(summary.commissionEarned),
        currency: typeof summary.currency === "string" ? summary.currency : "CAD",
        tasksOverdue: overdue.length,
        documentsRequired: stageCount("DOCUMENTS_REQUIRED"), additionalStepsRequired: stageCount("STARTUP"),
        offersOutstanding: stageCount("OFFER"), nextTask: toWidgetTask(next),
        nextMeeting: meetings[0] ? { id: meetings[0].id, title: meetings[0].title, start: meetings[0].start } : null,
        asOf: typeof summary.asOf === "string" ? summary.asOf : new Date().toISOString(),
      };
      await WidgetBridgePlugin.setItem({
        group: WIDGET_GROUP,
        key: SUMMARY_KEYS[silo],
        value: JSON.stringify(expanded),
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
