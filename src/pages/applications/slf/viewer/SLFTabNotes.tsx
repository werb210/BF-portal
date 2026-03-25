import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "@api/httpClient";

const API_PREFIX = "";
type SLFNote = {
  id: string;
  author: string;
  createdAt: string;
  text: string;
};

const SLFTabNotes = ({ applicationId }: { applicationId: string }) => {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { data: notes = [] } = useQuery<SLFNote[]>({
    queryKey: ["slf", "notes", applicationId],
    queryFn: ({ signal }) => apiClient.get<SLFNote[]>(`${API_PREFIX}/slf/applications/${applicationId}/notes`, { signal })
  });

  const mutation = useMutation({
    mutationFn: async () => apiClient.post(`${API_PREFIX}/slf/applications/${applicationId}/notes`, { text }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["slf", "notes", applicationId] });
    }
  });

  return (
    <div className="notes-tab">
      <div className="notes-list">
        {notes.map((note) => (
          <div key={note.id} className="note-item">
            <div className="note-meta">{note.author} — {new Date(note.createdAt).toLocaleString()}</div>
            <div>{note.text}</div>
          </div>
        ))}
        {!notes.length && <div>No internal notes yet.</div>}
      </div>
      <div className="notes-composer">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal note" />
        <button className="btn" onClick={() => mutation.mutate()} disabled={!text.trim()}>
          Post Note
        </button>
      </div>
    </div>
  );
};

export default SLFTabNotes;
