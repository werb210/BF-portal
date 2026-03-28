import { useState } from "react";
import type { NoteMessage } from "@/api/notes";

type NotesListProps = {
  notes: NoteMessage[];
  canEdit: boolean;
  onEdit: (noteId: string, body: string) => Promise<void> | void;
};

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const renderWithMentions = (text: string) => {
  const parts = text.split(/(@[\w.-]+)/g).filter(Boolean);
  return parts.map((part, index) =>
    part.startsWith("@") ? (
      <span key={`${part}-${index}`} className="note-mention">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
};

const NotesList = ({ notes, canEdit, onEdit }: NotesListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEditing = (note: NoteMessage) => {
    setEditingId(note.id);
    setDraft(note.body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft("");
  };

  const handleSave = async () => {
    if (!editingId) return;
    await onEdit(editingId, draft);
    cancelEditing();
  };

  return (
    <div className="notes-thread">
      {notes.map((note) => {
        const isEditing = editingId === note.id;
        return (
          <div key={note.id} className="note-message">
            <div className="note-message__avatar">{note.author.slice(0, 2).toUpperCase()}</div>
            <div className="note-message__body">
              <div className="note-message__header">
                <div className="note-message__author">{note.author}</div>
                <div className="note-message__timestamp">{formatTimestamp(note.createdAt)}</div>
              </div>
              {isEditing ? (
                <div className="note-message__edit">
                  <textarea
                    className="notes-composer__input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div className="note-message__actions">
                    <button className="btn btn--primary" type="button" onClick={handleSave}>
                      Save
                    </button>
                    <button className="btn btn--ghost" type="button" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="note-message__text">{renderWithMentions(note.body)}</div>
              )}
              {canEdit && !isEditing ? (
                <button className="btn btn--ghost note-message__edit-button" type="button" onClick={() => startEditing(note)}>
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotesList;
