// BI_PIPELINE_ALIGN_v57 — internal staff notes.
import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";

type Note = { id: string; body: string; author_name: string; created_at: string };
export default function NotesTab({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const load = useCallback(async () => { const r = await api<{ notes: Note[] }>(`/api/v1/bi/applications/${applicationId}/notes`); setNotes(r.notes); }, [applicationId]);
  useEffect(() => { void load(); }, [load]);
  return <ul>{notes.map((n) => <li key={n.id}>{n.author_name}: {n.body}</li>)}</ul>;
}
