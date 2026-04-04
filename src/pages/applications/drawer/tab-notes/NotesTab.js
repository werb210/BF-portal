import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotesThread, sendNoteMessage, updateNoteMessage } from "@/api/notes";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import NotesComposer from "./NotesComposer";
import NotesList from "./NotesList";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";
const NotesTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const queryClient = useQueryClient();
    const containerRef = useRef(null);
    const { user } = useAuth();
    const { activeBusinessUnit } = useBusinessUnit();
    const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
    const canEdit = canWrite(user?.role ?? null);
    const { data: messages = [], isLoading, error } = useQuery({
        queryKey: ["notes", businessUnit, applicationId],
        queryFn: ({ signal }) => fetchNotesThread(applicationId ?? "", businessUnit, { signal }),
        enabled: Boolean(applicationId)
    });
    const mutation = useMutation({
        mutationFn: ({ text, mentions }) => sendNoteMessage(applicationId ?? "", text, businessUnit, mentions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes", businessUnit, applicationId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        }
    });
    const editMutation = useMutation({
        mutationFn: ({ noteId, body }) => updateNoteMessage(applicationId ?? "", noteId, body, businessUnit),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes", businessUnit, applicationId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        }
    });
    const sortedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages]);
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [sortedMessages]);
    const handleSend = async (text, mentions) => {
        const uniqueMentions = Array.from(new Set(mentions));
        await mutation.mutateAsync({ text, mentions: uniqueMentions });
    };
    const handleEdit = async (noteId, body) => {
        await editMutation.mutateAsync({ noteId, body });
    };
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view notes." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading notes\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load notes.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__notes", children: [_jsx("div", { ref: containerRef, children: sortedMessages.length ? (_jsx(NotesList, { notes: sortedMessages, canEdit: canEdit, onEdit: handleEdit })) : (_jsx("div", { className: "drawer-placeholder", children: "No notes yet." })) }), canEdit ? (_jsx(NotesComposer, { onSend: handleSend })) : (_jsx("div", { className: "drawer-placeholder", children: "Notes are read-only for your role." }))] }));
};
export default NotesTab;
