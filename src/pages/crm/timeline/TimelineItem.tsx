import type { TimelineEvent } from "@/api/crm";

const iconForType: Record<TimelineEvent["type"], string> = {
  call: "📞",
  sms: "💬",
  email: "✉️",
  note: "📝",
  document: "📄",
  status: "🔄",
  ai: "🤖",
  lender: "🏦",
  system: "⚙️",
  RULE_TRIGGERED: "🧭",
  AUTO_SMS_SENT: "📲",
  AUTO_TASK_CREATED: "✅",
  FOLLOW_UP_REMINDER: "⏰"
};

const callOutcomeIcons: Record<string, string> = {
  completed: "📞✅",
  voicemail: "📞📮",
  failed: "📞❌",
  "no-answer": "📞⏳",
  canceled: "📞🚫"
};

const formatDuration = (durationSeconds?: number) => {
  if (durationSeconds === undefined) return null;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const automationMeta: Partial<
  Record<TimelineEvent["type"], { label: string; explanation: string }>
> = {
  RULE_TRIGGERED: {
    label: "Rule triggered",
    explanation: "Automation rule detected a follow-up condition."
  },
  AUTO_SMS_SENT: {
    label: "Automated SMS sent",
    explanation: "System dispatched a follow-up SMS automatically."
  },
  AUTO_TASK_CREATED: {
    label: "Automated task created",
    explanation: "System created a follow-up task for staff."
  },
  FOLLOW_UP_REMINDER: {
    label: "Follow-up reminder",
    explanation: "Reminder queued for staff attention."
  }
};

interface TimelineItemProps {
  event: TimelineEvent;
  similarCount?: number;
  onSelectAutomation?: (event: TimelineEvent) => void;
  isSelected?: boolean;
}

const TimelineItem = ({ event, similarCount = 0, onSelectAutomation, isSelected }: TimelineItemProps) => {
  const callMetadata = event.type === "call" ? event.call : undefined;
  const callOutcome = callMetadata?.outcome;
  const icon = callOutcome ? callOutcomeIcons[callOutcome] ?? iconForType[event.type] : iconForType[event.type];
  const date = new Date(event.occurredAt).toLocaleTimeString();
  const automationInfo = automationMeta[event.type];
  const isAutomation = Boolean(automationInfo);
  const durationLabel = formatDuration(callMetadata?.durationSeconds);
  const content = (
    <>
      <div className="font-bold">{automationInfo?.label ?? event.summary}</div>
      {isAutomation && <div className="text-sm text-slate-700">{event.summary}</div>}
      <div className="text-sm text-gray-600">{date}</div>
      {(automationInfo?.explanation || event.details) && (
        <div className="text-sm text-gray-600">{automationInfo?.explanation ?? event.details}</div>
      )}
      {event.type === "call" && (
        <div className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            {callOutcome && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase">{callOutcome}</span>}
            {durationLabel && <span className="text-xs text-slate-500">Duration {durationLabel}</span>}
            {callMetadata?.failureReason && (
              <span className="text-xs text-rose-600">Reason: {callMetadata.failureReason}</span>
            )}
          </div>
          <button
            type="button"
            className="text-left text-xs font-semibold text-slate-500"
            disabled
            aria-disabled="true"
          >
            ▶︎ Play recording (coming soon)
          </button>
        </div>
      )}
      {similarCount > 0 && <div className="text-xs text-slate-500">+{similarCount} similar events</div>}
    </>
  );

  if (isAutomation && onSelectAutomation) {
    return (
      <button
        type="button"
        className={`timeline-item text-left ${isSelected ? "border border-emerald-200 bg-emerald-50" : ""}`}
        data-testid={`timeline-${event.id}`}
        onClick={() => onSelectAutomation(event)}
      >
        <div className="timeline-item__icon">{icon}</div>
        <div>{content}</div>
      </button>
    );
  }

  return (
    <div className="timeline-item" data-testid={`timeline-${event.id}`}>
      <div className="timeline-item__icon">{icon}</div>
      <div>{content}</div>
    </div>
  );
};

export default TimelineItem;
