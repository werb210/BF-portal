import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
const ChatPanel = ({ applicationId }) => {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState("");
    const [typing, setTyping] = useState(false);
    const { data } = useQuery({
        queryKey: ["messages", applicationId],
        queryFn: () => api.get(`/messages/${applicationId}`),
        refetchInterval: 3000
    });
    const sendMessage = useMutation({
        mutationFn: (body) => api.post("/api/messages", { applicationId, body }),
        onSuccess: () => {
            setDraft("");
            setTyping(false);
            void queryClient.invalidateQueries({ queryKey: ["messages", applicationId] });
        }
    });
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "max-h-60 overflow-auto rounded border p-2", children: (data ?? []).map((message) => (_jsxs("div", { className: "mb-2 text-sm", children: [_jsxs("strong", { children: [message.sender, ":"] }), " ", message.body] }, message.id))) }), typing ? _jsx("p", { className: "text-xs text-slate-500", children: "Typing\u2026" }) : null, _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "flex-1", value: draft, onChange: (event) => {
                            setDraft(event.target.value);
                            setTyping(event.target.value.length > 0);
                        }, placeholder: "Type a message" }), _jsx("button", { type: "button", disabled: !draft.trim() || sendMessage.isPending, onClick: () => sendMessage.mutate(draft), children: "Send" })] })] }));
};
export default ChatPanel;
