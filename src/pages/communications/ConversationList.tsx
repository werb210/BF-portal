import { useMemo } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { CommunicationConversation } from "@/api/communications";
import ConversationItem from "./ConversationItem";
import type { ConversationFilters } from "@/state/communications.store";

interface ConversationListProps {
  conversations: CommunicationConversation[];
  selectedConversationId?: string;
  filters: ConversationFilters;
  onFiltersChange: (filters: Partial<ConversationFilters>) => void;
  onSelectConversation: (id: string) => void;
}

const ConversationList = ({
  conversations,
  selectedConversationId,
  filters,
  onFiltersChange,
  onSelectConversation
}: ConversationListProps) => {
  const staffOptions = useMemo(
    () => Array.from(new Set(conversations.map((conv) => conv.assignedTo).filter(Boolean))) as string[],
    [conversations]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Select
          label="Channel"
          value={filters.channel}
          onChange={(e) => onFiltersChange({ channel: e.target.value as ConversationFilters["channel"] })}
        >
          <option value="all">All</option>
          <option value="chat">Chat</option>
          <option value="human">Talk to Human</option>
          <option value="issue">Issue</option>
          <option value="sms">SMS</option>
          <option value="system">System</option>
          <option value="credit_readiness">Credit Readiness</option>
          <option value="contact_form">Contact Form</option>
        </Select>
        <Select
          label="Silo"
          value={filters.silo}
          onChange={(e) => onFiltersChange({ silo: e.target.value as ConversationFilters["silo"] })}
        >
          <option value="all">All Silos</option>
          <option value="BF">BF</option>
          <option value="BI">BI</option>
          <option value="SLF">SLF</option>
        </Select>
        <Select
          label="Assigned"
          value={filters.assigned}
          onChange={(e) => onFiltersChange({ assigned: e.target.value as ConversationFilters["assigned"] })}
        >
          <option value="all">Anyone</option>
          {staffOptions.map((staff) => (
            <option key={staff} value={staff}>
              {staff}
            </option>
          ))}
        </Select>
        <Input
          label="Search"
          placeholder="Name or application ID"
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
        />
      </div>
      <div className="overflow-y-auto flex-1" data-testid="conversation-list">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            selected={conversation.id === selectedConversationId}
            onSelect={onSelectConversation}
          />
        ))}
        {!conversations.length && <div className="text-sm text-slate-500">No conversations match filters.</div>}
      </div>
    </div>
  );
};

export default ConversationList;
