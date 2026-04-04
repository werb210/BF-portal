import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api";
const API_PREFIX = "";
const SLFTabNotes = ({ applicationId }) => {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const { data: notes = [] } = useQuery({
        queryKey: ["slf", "notes", applicationId],
        queryFn: ({ signal }) => api.get(`${API_PREFIX}/slf/applications/${applicationId}/notes`, { signal })
    });
    const mutation = useMutation({
        mutationFn: async () => api.post(`${API_PREFIX}/slf/applications/${applicationId}/notes`, { text }),
        onSuccess: () => {
            setText("");
            queryClient.invalidateQueries({ queryKey: ["slf", "notes", applicationId] });
        }
    });
    return (_jsxs("div", { className: "notes-tab", children: [_jsxs("div", { className: "notes-list", children: [notes.map((note) => (_jsxs("div", { className: "note-item", children: [_jsxs("div", { className: "note-meta", children: [note.author, " \u2014 ", new Date(note.createdAt).toLocaleString()] }), _jsx("div", { children: note.text })] }, note.id))), !notes.length && _jsx("div", { children: "No internal notes yet." })] }), _jsxs("div", { className: "notes-composer", children: [_jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), placeholder: "Add an internal note" }), _jsx("button", { className: "btn", onClick: () => mutation.mutate(), disabled: !text.trim(), children: "Post Note" })] })] }));
};
export default SLFTabNotes;
