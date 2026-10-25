import { Capacitor } from "@capacitor/core";
import { api } from "@/api";
import { WidgetBridgePlugin, WIDGET_GROUP } from "@/native/widgetBridge";
import { fetchLocalEvents } from "@/api/calendar";
import { pipelineApi } from "@/pipeline/pipeline.api";
import { normalizeStageId } from "@/pipeline/pipeline.types";
import { isDraftLikeApplication, type DraftLikeCard } from "@/pages/pipeline/draftLike";
import { BI_VISIBLE_PIPELINE_STAGES, resolveStageId } from "@/silos/bi/pipeline/biStages";

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

// BF_PORTAL_WIDGET_LIVE_COUNTS_v365 - the pipeline figure on each widget is the
// figure the portal shows for that silo. /api/widget/summary counts BF-Server's
// own applications table, which holds no Insurance or SLF deals (those live on
// BI-Server and slf-server), so those widgets always read 0, and its Financial
// rule differed from the board header. Each silo now counts from the same call
// its own screen uses; the summary figure stays as the fallback when offline.
const listFrom = (payload: unknown): unknown[] | null => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  for (const c of [p.items, p.applications, p.data]) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object" && Array.isArray((c as Record<string, unknown>).items)) {
      return (c as Record<string, unknown>).items as unknown[];
    }
  }
  return null;
};

const biHideDemo = (): boolean => {
  try { return localStorage.getItem("bi.dashboard.hide_demo") === "1"; } catch { return false; }
};

/** The count the portal shows for this silo, or null when it cannot be read. */
export async function livePipelineCount(silo: WidgetSilo): Promise<number | null> {
  try {
    if (silo === "BF") {
      // The Pipeline header: /api/portal/applications without drafts, minus junk drafts.
      const list = listFrom(await api<unknown>("/api/portal/applications", { headers: { "X-Silo": silo } }));
      return list ? (list as DraftLikeCard[]).filter((card) => !isDraftLikeApplication(card)).length : null;
    }
    if (silo === "BI") {
      // The BI Dashboard's "Total in pipeline": applications in the visible stage columns.
      const list = listFrom(await api<unknown>(`/api/v1/bi/applications${biHideDemo() ? "?hide_demo=true" : ""}`));
      if (!list) return null;
      const visible = BI_VISIBLE_PIPELINE_STAGES as readonly string[];
      return (list as Array<{ stage?: string | null }>).filter((a) => {
        const stage = resolveStageId(a?.stage) ?? String(a?.stage ?? "");
        return visible.includes(stage);
      }).length;
    }
    // The SLF page's "Deals": every deal synced from SLF.
    const list = listFrom(await api<unknown>("/api/slf/deals?limit=500"));
    return list ? list.length : null;
  } catch {
    return null;
  }
}

// BF_PORTAL_v854_KS_WIDGETS - Keystone (KS) on the staff widget. BF-Server works out every Keystone figure in the one
// /api/widget/summary call (X-Silo: KS) and decides access itself: staff outside the Keystone CRM get an empty summary
// with the reason, which the widget shows instead of numbers. A reply that is not a Keystone summary (a server from
// before this change answers with the caller's own silo) is never written, so BF numbers cannot appear as Keystone.
export const KS_WIDGET_KEY = "widget_summary_KS";
const KS_REASON_FALLBACK = "Keystone isn't turned on for your account.";

export type KeystoneWidgetSummary = {
  schemaVersion: 2;
  silo: "KS";
  available: boolean;
  unavailableReason: string | null;
  pipelineCount: number;
  tasksDueToday: number;
  tasksOverdue: number;
  unreadMessages: number;
  commissionEarned: 0;
  payingLicensees: number;
  demosNeedFollowUp: number;
  openSupportTickets: number | null;
  currency: "CAD";
  documentsRequired: 0;
  additionalStepsRequired: 0;
  offersOutstanding: 0;
  nextTask: WidgetTask | null;
  nextMeeting: { id: string; title: string; start: string } | null;
  asOf: string;
};

const shortText = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const isoOrNull = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

/** The server's Keystone summary in the widget's stored shape, or null when the reply is not a Keystone summary. */
export function keystoneSnapshot(raw: unknown): KeystoneWidgetSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (s.kind !== "keystone" || s.silo !== "KS") return null;
  const available = s.available !== false;
  const task = s.nextTask && typeof s.nextTask === "object" ? (s.nextTask as Record<string, unknown>) : null;
  const meeting = s.nextMeeting && typeof s.nextMeeting === "object" ? (s.nextMeeting as Record<string, unknown>) : null;
  const meetingStart = meeting ? isoOrNull(meeting.start) : null;
  const tickets = s.openSupportTickets;
  return {
    schemaVersion: 2,
    silo: "KS",
    available,
    unavailableReason: available ? null : shortText(s.reason, 200) ?? KS_REASON_FALLBACK,
    pipelineCount: available ? safeNumber(s.pipelineCount) : 0,
    tasksDueToday: available ? safeNumber(s.tasksDueToday) : 0,
    tasksOverdue: available ? safeNumber(s.tasksOverdue) : 0,
    unreadMessages: available ? safeNumber(s.unreadMessages) : 0,
    commissionEarned: 0,
    payingLicensees: available ? safeNumber(s.payingLicensees) : 0,
    demosNeedFollowUp: available ? safeNumber(s.demosNeedFollowUp) : 0,
    openSupportTickets: available && tickets !== null && tickets !== undefined ? safeNumber(tickets) : null,
    currency: "CAD",
    documentsRequired: 0,
    additionalStepsRequired: 0,
    offersOutstanding: 0,
    nextTask: available && task ? {
      id: String(task.id ?? ""),
      title: shortText(task.title, 200) ?? "Task",
      type: shortText(task.type, 20) ?? "TODO",
      dueAt: isoOrNull(task.dueAt),
      contactName: shortText(task.contactName, 200),
    } : null,
    nextMeeting: available && meeting && meetingStart ? {
      id: String(meeting.id ?? ""),
      title: shortText(meeting.title, 200) ?? "Keystone booking",
      start: meetingStart,
    } : null,
    asOf: isoOrNull(s.asOf) ?? new Date().toISOString(),
  };
}

/** Writes the Keystone snapshot; rejects (writing nothing) when there is no Keystone summary to write. */
export async function publishKeystoneSnapshot(): Promise<void> {
  const snapshot = keystoneSnapshot(await api<unknown>("/api/widget/summary", { headers: { "X-Silo": "KS" } }));
  if (!snapshot) throw new Error("not_a_keystone_summary");
  await WidgetBridgePlugin.setItem({ group: WIDGET_GROUP, key: KS_WIDGET_KEY, value: JSON.stringify(snapshot) });
}

/** Publish every summary the signed-in user can access. */
export async function publishWidgetSnapshot(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;

  const results = await Promise.allSettled([ // BF_PORTAL_v854_KS_WIDGETS - plus Keystone
    ...WIDGET_SILOS.map(async (silo) => {
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
        pipelineCount: (await livePipelineCount(silo)) ?? safeNumber(summary.pipelineCount),
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
    publishKeystoneSnapshot(), // BF_PORTAL_v854_KS_WIDGETS
  ]);

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
