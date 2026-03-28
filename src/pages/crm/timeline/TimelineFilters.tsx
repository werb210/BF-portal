import Button from "@/components/ui/Button";
import type { TimelineEventType } from "@/api/crm";

interface TimelineFiltersProps {
  activeTypes: TimelineEventType[];
  onToggle: (type: TimelineEventType) => void;
  onReset: () => void;
}

const eventTypes: TimelineEventType[] = [
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

const TimelineFilters = ({ activeTypes, onToggle, onReset }: TimelineFiltersProps) => (
  <div className="flex gap-2 flex-wrap items-center mb-2" data-testid="timeline-filters">
    {eventTypes.map((type) => (
      <label key={type} className="flex gap-1 items-center">
        <input
          type="checkbox"
          checked={activeTypes.includes(type)}
          onChange={() => onToggle(type)}
        />
        {type}
      </label>
    ))}
    <Button variant="secondary" onClick={onReset}>
      Reset Filters
    </Button>
  </div>
);

export default TimelineFilters;
