// BF_NOTES_UI_v49 — application-scoped notes UI.
// Inline create / edit / delete. @mention tokens are rendered as highlighted
// spans (autocomplete is V2). Talks to /api/applications/:id/notes.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  createApplicationNote,
  deleteApplicationNote,
  listApplicationNotes,
  updateApplicationNote,
  type AppNote,
  type ListResponse,
} from "@/api/applicationNotes";
import { getErrorMessage } from "@/utils/errors";

interface Props {
  applicationId: string;
}

const MENTION_RE = /(^|[\s(])@([a-zA-Z0-9_.\-]{2,40})/g;

function renderBodyWithMentions(body: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    const idx = m.index + (m[1] ? m[1].length : 0);
    if (idx > last) out.push(body.slice(last, idx));
    out.push(
      <span key={`m-${idx}`} className="rounded bg-blue-50 px-1 text-blue-700">
        @{m[2] ?? ""}
      </span>
    );
    last = idx + 1 + (m[2]?.length ?? 0);
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

export default function NotesEditor({ applicationId }: Props) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["application-notes", applicationId], [applicationId]);
  const { data, isLoading, error } = useQuery<ListResponse>({
    queryKey,
    queryFn: ({ signal }) => listApplicationNotes(applicationId, { signal }),
    enabled: Boolean(applicationId),
  });

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(""); setEditingId(null); setEditingBody(""); setStatusMsg(null);
  }, [applicationId]);

  const create = useMutation({
    mutationFn: (body: string) => createApplicationNote(applicationId, body),
    onSuccess: () => { setDraft(""); setStatusMsg("Note added."); qc.invalidateQueries({ queryKey }); },
    onError: (err) => setStatusMsg(`Add failed: ${getErrorMessage(err, "unknown error")}`),
  });

  const update = useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      updateApplicationNote(applicationId, noteId, body),
    onSuccess: () => { setEditingId(null); setEditingBody(""); setStatusMsg("Note updated."); qc.invalidateQueries({ queryKey }); },
    onError: (err) => setStatusMsg(`Update failed: ${getErrorMessage(err, "unknown error")}`),
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteApplicationNote(applicationId, noteId),
    onSuccess: () => { setStatusMsg("Note deleted."); qc.invalidateQueries({ queryKey }); },
    onError: (err) => setStatusMsg(`Delete failed: ${getErrorMessage(err, "unknown error")}`),
  });

  if (!applicationId) return <div>Select an application to view notes.</div>;
  if (isLoading) return <div>Loading notes…</div>;
  if (error) return <div>{getErrorMessage(error, "Unable to load notes.")}</div>;

  const notes: AppNote[] = data?.items ?? [];

  return (
    <div className="space-y-4" data-testid="notes-editor">
      <Card title="Add a note">
        <textarea
          className="min-h-[80px] w-full rounded border p-2 text-sm"
          placeholder="Write a note. Use @username to mention a teammate."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          data-testid="note-draft"
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={() => create.mutate(draft.trim())}
            disabled={!draft.trim() || create.isPending}
            data-testid="add-note-btn"
          >
            {create.isPending ? "Adding…" : "Add note"}
          </Button>
        </div>
      </Card>

      {statusMsg && <div className="text-sm text-gray-700" data-testid="notes-status-msg">{statusMsg}</div>}

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">No notes yet.</p>
      ) : (
        <ul className="space-y-2" data-testid="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="rounded border p-3 text-sm" data-testid={`note-${n.id}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>{n.owner_name ?? "Staff"} · {new Date(n.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => { setEditingId(n.id); setEditingBody(n.body); }}
                    data-testid={`edit-${n.id}`}
                  >Edit</button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm("Delete this note?")) {
                        remove.mutate(n.id);
                      }
                    }}
                    data-testid={`delete-${n.id}`}
                  >Delete</button>
                </div>
              </div>
              {editingId === n.id ? (
                <div>
                  <textarea
                    className="min-h-[60px] w-full rounded border p-2 text-sm"
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    data-testid={`edit-textarea-${n.id}`}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      onClick={() => update.mutate({ noteId: n.id, body: editingBody.trim() })}
                      disabled={!editingBody.trim() || update.isPending}
                    >
                      {update.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditingId(null); setEditingBody(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap" data-testid={`note-body-${n.id}`}>
                  {renderBodyWithMentions(n.body)}
                </div>
              )}
              {n.mentions?.length > 0 && (
                <div className="mt-2 text-xs text-gray-500" data-testid={`note-mentions-${n.id}`}>
                  Notified: {n.mentions.length} user{n.mentions.length === 1 ? "" : "s"}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
