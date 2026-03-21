import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TimelineEvent, TimelineEventType } from "@api/crm";
import { fetchTimeline } from "@api/crm";
import { useAuth } from "@/hooks/useAuth";
import { fullStaffRoles, hasRequiredRole, resolveUserRole } from "@/utils/roles";
import TimelineItem from "./TimelineItem";
import TimelineFilters from "./TimelineFilters";

interface TimelineFeedProps {
  entityType: "contact" | "company";
  entityId: string;
  initialEvents?: TimelineEvent[];
}

const defaultActiveTypes: TimelineEventType[] = [
  "call",
  "sms",
  "email",
  "note",
  "document",
  "status",
  "ai",
  "lender",
  "system",
  "RULE_TRIGGERED",
  "AUTO_SMS_SENT",
  "AUTO_TASK_CREATED",
  "FOLLOW_UP_REMINDER"
];

const automationTypes = new Set<TimelineEventType>([
  "RULE_TRIGGERED",
  "AUTO_SMS_SENT",
  "AUTO_TASK_CREATED",
  "FOLLOW_UP_REMINDER"
]);

type CollapsedEvent = {
  event: TimelineEvent;
  similarCount: number;
};

type TimelineDisplayItem =
  | { kind: "event"; event: TimelineEvent; similarCount: number }
  | { kind: "automation"; id: string; title: string; events: CollapsedEvent[] };

const collapseSimilarEvents = (events: TimelineEvent[]) => {
  const windowMs = 1000 * 60 * 5;
  const collapsed: CollapsedEvent[] = [];
  for (const event of events) {
    const last = collapsed[collapsed.length - 1];
    if (last) {
      const sameRule = (last.event.automation?.ruleId ?? "") === (event.automation?.ruleId ?? "");
      const isSame =
        last.event.type === event.type && last.event.summary === event.summary && sameRule;
      const timeDelta = Math.abs(
        new Date(last.event.occurredAt).getTime() - new Date(event.occurredAt).getTime()
      );
      if (isSame && timeDelta <= windowMs) {
        last.similarCount += 1;
        continue;
      }
    }
    collapsed.push({ event, similarCount: 0 });
  }
  return collapsed;
};

const TimelineFeed = ({ entityType, entityId, initialEvents = [] }: TimelineFeedProps) => {
  const [activeTypes, setActiveTypes] = useState<TimelineEventType[]>(defaultActiveTypes);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedAutomation, setSelectedAutomation] = useState<TimelineEvent | null>(null);
  const { user } = useAuth();
  const canViewAutomationDetails = hasRequiredRole(
    resolveUserRole((user as { role?: string | null } | null)?.role ?? null),
    fullStaffRoles
  );
  const { data: events = initialEvents, refetch } = useQuery({
    queryKey: ["timeline", entityType, entityId],
    queryFn: () => fetchTimeline(entityType, entityId),
    initialData: initialEvents
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const grouped = useMemo(() => {
    const filtered = events.filter((event) => activeTypes.includes(event.type));
    return filtered.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
      const dateKey = new Date(event.occurredAt).toDateString();
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], event] : [event];
      return acc;
    }, {});
  }, [events, activeTypes]);

  const groupedDisplayItems = useMemo(() => {
    return Object.entries(grouped).map(([date, eventsForDate]) => {
      const sorted = [...eventsForDate].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
      const displayItems: TimelineDisplayItem[] = [];
      let buffer: TimelineEvent[] = [];
      const flushAutomationGroup = () => {
        if (!buffer.length) return;
        const collapsed = collapseSimilarEvents(buffer);
        const first = buffer[0];
        const last = buffer[buffer.length - 1];
        if (!first || !last) return;
        const title =
          buffer.length > 1 ? `${first.summary} → ${last.summary}` : first.summary;
        const ruleKey = first.automation?.ruleId ?? "automation";
        const id = `${date}-${ruleKey}-${displayItems.length}`;
        displayItems.push({ kind: "automation", id, title, events: collapsed });
        buffer = [];
      };

      for (const event of sorted) {
        if (automationTypes.has(event.type)) {
          buffer.push(event);
        } else {
          flushAutomationGroup();
          displayItems.push({ kind: "event", event, similarCount: 0 });
        }
      }
      flushAutomationGroup();

      return { date, items: displayItems };
    });
  }, [grouped]);

  const toggleType = (type: TimelineEventType) => {
    setActiveTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const renderAutomationDetails = () => {
    if (!selectedAutomation) return null;
    return (
      <div className="mb-4 rounded border border-slate-200 bg-white p-4 shadow-sm" data-testid="automation-details">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Automation details</h3>
            <p className="text-xs text-slate-500">
              {new Date(selectedAutomation.occurredAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-slate-500"
            onClick={() => setSelectedAutomation(null)}
          >
            Close
          </button>
        </div>
        {!canViewAutomationDetails ? (
          <p className="mt-3 text-sm text-slate-500">Automation metadata is restricted to staff.</p>
        ) : (
          <dl className="mt-3 grid gap-3 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-slate-500">Rule ID</dt>
              <dd>{selectedAutomation.automation?.ruleId ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Trigger reason</dt>
              <dd>{selectedAutomation.automation?.triggerReason ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Time delay condition</dt>
              <dd>{selectedAutomation.automation?.delayCondition ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Action taken</dt>
              <dd>{selectedAutomation.automation?.action ?? "Not provided"}</dd>
            </div>
            {selectedAutomation.automation?.internalNotes && (
              <div>
                <dt className="font-semibold text-slate-500">Internal notes</dt>
                <dd>{selectedAutomation.automation.internalNotes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    );
  };

  return (
    <div data-testid="timeline-feed">
      <TimelineFilters activeTypes={activeTypes} onToggle={toggleType} onReset={() => setActiveTypes(defaultActiveTypes)} />
      {renderAutomationDetails()}
      {groupedDisplayItems.map(({ date, items }) => (
        <div key={date} className="mb-4">
          <h4 className="font-semibold">{date}</h4>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              if (item.kind === "event") {
                return <TimelineItem key={item.event.id} event={item.event} similarCount={item.similarCount} />;
              }
              const isExpanded = Boolean(expandedGroups[item.id]);
              return (
                <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-3" data-testid={`automation-group-${item.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => toggleGroup(item.id)}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-500">Automations</div>
                      <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                    </div>
                    <div className="text-xs text-slate-500">{isExpanded ? "Hide" : "Show"} ({item.events.length})</div>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 flex flex-col gap-2">
                      {item.events.map(({ event, similarCount }) => (
                        <TimelineItem
                          key={event.id}
                          event={event}
                          similarCount={similarCount}
                          onSelectAutomation={setSelectedAutomation}
                          isSelected={selectedAutomation?.id === event.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineFeed;
