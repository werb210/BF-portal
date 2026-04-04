import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessagesThread, sendMessage } from "@/api/messages";
import MessageThread from "@/components/chat/MessageThread";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
const MessagesTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const queryClient = useQueryClient();
    const containerRef = useRef(null);
    const [draft, setDraft] = useState("");
    const { data: messages = [], isLoading, error } = useQuery({
        queryKey: ["messages", applicationId],
        queryFn: ({ signal }) => fetchMessagesThread(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId)
    });
    const mutation = useMutation({
        mutationFn: (text) => sendMessage(applicationId ?? "", text),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", applicationId] })
    });
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);
    const handleSend = async () => {
        if (!draft.trim())
            return;
        await mutation.mutateAsync(draft.trim());
        setDraft("");
    };
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view messages." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading messages\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load messages.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__messages", children: [_jsx("div", { className: "notes-thread", ref: containerRef, children: _jsx(MessageThread, { messages: messages }) }), _jsxs("div", { className: "notes-composer", children: [_jsx("textarea", { className: "notes-composer__input", value: draft, onChange: (event) => setDraft(event.target.value), placeholder: "Submit a message to the client" }), _jsx("button", { className: "btn btn--primary", onClick: handleSend, disabled: mutation.isPending, type: "button", children: mutation.isPending ? "Submitting…" : "Submit" })] })] }));
};
export default MessagesTab;
