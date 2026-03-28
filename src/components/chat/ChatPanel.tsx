import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/httpClient";

type ChatMessage = {
  id: string;
  body: string;
  sender: string;
  createdAt: string;
};

type ChatPanelProps = {
  applicationId: string;
};

const ChatPanel = ({ applicationId }: ChatPanelProps) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const { data } = useQuery({
    queryKey: ["messages", applicationId],
    queryFn: () => apiClient.get<ChatMessage[]>(`/messages/${applicationId}`),
    refetchInterval: 3000
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => apiClient.post("/messages", { applicationId, body }),
    onSuccess: () => {
      setDraft("");
      setTyping(false);
      void queryClient.invalidateQueries({ queryKey: ["messages", applicationId] });
    }
  });

  return (
    <div className="space-y-2">
      <div className="max-h-60 overflow-auto rounded border p-2">
        {(data ?? []).map((message) => (
          <div key={message.id} className="mb-2 text-sm">
            <strong>{message.sender}:</strong> {message.body}
          </div>
        ))}
      </div>
      {typing ? <p className="text-xs text-slate-500">Typing…</p> : null}
      <div className="flex gap-2">
        <input
          className="flex-1"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setTyping(event.target.value.length > 0);
          }}
          placeholder="Type a message"
        />
        <button type="button" disabled={!draft.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate(draft)}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
