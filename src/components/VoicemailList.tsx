import { useEffect, useState } from "react";
import { fetchVoicemails, type Voicemail } from "@/api/voicemail";

interface VoicemailListProps {
  clientId: string;
}

export function VoicemailList({ clientId }: VoicemailListProps): JSX.Element {
  const [items, setItems] = useState<Voicemail[]>([]);

  useEffect(() => {
    void fetchVoicemails(clientId).then(setItems);
  }, [clientId]);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded border p-2">
          <span className="mb-2 block text-sm text-slate-600">{new Date(item.createdAt).toLocaleString()}</span>
          <audio controls src={item.recordingUrl} />
        </div>
      ))}
    </div>
  );
}
