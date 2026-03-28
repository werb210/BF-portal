import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessagesThread, sendMessage } from "@/api/messages";
import MessageThread from "@/components/chat/MessageThread";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import type { MessageRecord } from "@/types/messages.types";
import { getErrorMessage } from "@/utils/errors";

const MessagesTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");

  const { data: messages = [], isLoading, error } = useQuery<MessageRecord[]>({
    queryKey: ["messages", applicationId],
    queryFn: ({ signal }) => fetchMessagesThread(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId)
  });

  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage(applicationId ?? "", text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", applicationId] })
  });

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    await mutation.mutateAsync(draft.trim());
    setDraft("");
  };

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view messages.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading messages…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load messages.")}</div>;

  return (
    <div className="drawer-tab drawer-tab__messages">
      <div className="notes-thread" ref={containerRef}>
        <MessageThread messages={messages} />
      </div>
      <div className="notes-composer">
        <textarea
          className="notes-composer__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Submit a message to the client"
        />
        <button className="btn btn--primary" onClick={handleSend} disabled={mutation.isPending} type="button">
          {mutation.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default MessagesTab;
