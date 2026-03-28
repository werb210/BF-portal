import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotesThread, sendNoteMessage, updateNoteMessage, type NoteMessage } from "@/api/notes";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const { activeBusinessUnit } = useBusinessUnit();
  const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
  const canEdit = canWrite((user as { role?: string | null } | null)?.role ?? null);
  const { data: messages = [], isLoading, error } = useQuery<NoteMessage[]>({
    queryKey: ["notes", businessUnit, applicationId],
    queryFn: ({ signal }) => fetchNotesThread(applicationId ?? "", businessUnit, { signal }),
    enabled: Boolean(applicationId)
  });

  const mutation = useMutation({
    mutationFn: ({ text, mentions }: { text: string; mentions: string[] }) =>
      sendNoteMessage(applicationId ?? "", text, businessUnit, mentions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", businessUnit, applicationId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      updateNoteMessage(applicationId ?? "", noteId, body, businessUnit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", businessUnit, applicationId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    }
  });

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [sortedMessages]);

  const handleSend = async (text: string, mentions: string[]) => {
    const uniqueMentions = Array.from(new Set(mentions));
    await mutation.mutateAsync({ text, mentions: uniqueMentions });
  };

  const handleEdit = async (noteId: string, body: string) => {
    await editMutation.mutateAsync({ noteId, body });
  };

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view notes.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading notes…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load notes.")}</div>;

  return (
    <div className="drawer-tab drawer-tab__notes">
      <div ref={containerRef}>
        {sortedMessages.length ? (
          <NotesList notes={sortedMessages} canEdit={canEdit} onEdit={handleEdit} />
        ) : (
          <div className="drawer-placeholder">No notes yet.</div>
        )}
      </div>
      {canEdit ? (
        <NotesComposer onSend={handleSend} />
      ) : (
        <div className="drawer-placeholder">Notes are read-only for your role.</div>
      )}
    </div>
  );
};

export default NotesTab;
