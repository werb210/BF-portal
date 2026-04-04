import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const formatTimestamp = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleString();
};
const renderWithMentions = (text) => {
    const parts = text.split(/(@[\w.-]+)/g).filter(Boolean);
    return parts.map((part, index) => part.startsWith("@") ? (_jsx("span", { className: "note-mention", children: part }, `${part}-${index}`)) : (_jsx("span", { children: part }, `${part}-${index}`)));
};
const NotesList = ({ notes, canEdit, onEdit }) => {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState("");
    const startEditing = (note) => {
        setEditingId(note.id);
        setDraft(note.body);
    };
    const cancelEditing = () => {
        setEditingId(null);
        setDraft("");
    };
    const handleSave = async () => {
        if (!editingId)
            return;
        await onEdit(editingId, draft);
        cancelEditing();
    };
    return (_jsx("div", { className: "notes-thread", children: notes.map((note) => {
            const isEditing = editingId === note.id;
            return (_jsxs("div", { className: "note-message", children: [_jsx("div", { className: "note-message__avatar", children: note.author.slice(0, 2).toUpperCase() }), _jsxs("div", { className: "note-message__body", children: [_jsxs("div", { className: "note-message__header", children: [_jsx("div", { className: "note-message__author", children: note.author }), _jsx("div", { className: "note-message__timestamp", children: formatTimestamp(note.createdAt) })] }), isEditing ? (_jsxs("div", { className: "note-message__edit", children: [_jsx("textarea", { className: "notes-composer__input", value: draft, onChange: (event) => setDraft(event.target.value) }), _jsxs("div", { className: "note-message__actions", children: [_jsx("button", { className: "btn btn--primary", type: "button", onClick: handleSave, children: "Save" }), _jsx("button", { className: "btn btn--ghost", type: "button", onClick: cancelEditing, children: "Cancel" })] })] })) : (_jsx("div", { className: "note-message__text", children: renderWithMentions(note.body) })), canEdit && !isEditing ? (_jsx("button", { className: "btn btn--ghost note-message__edit-button", type: "button", onClick: () => startEditing(note), children: "Edit" })) : null] })] }, note.id));
        }) }));
};
export default NotesList;
