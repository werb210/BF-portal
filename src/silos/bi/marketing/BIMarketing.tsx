import { useEffect, useState } from "react";
import { api } from "@/api";
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer";
import SequenceCanvas, { type BISequenceStep, type SequenceQueue, type SequenceTemplate } from "@/components/marketing/SequenceCanvas";
import MarketingT from "./MarketingT";

type Channel = "apollo" | "email" | "sequences";

// BF_PORTAL_SEQUENCE_CANVAS_v1 — BI mounts the shared canvas with its own API.
export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>("apollo");
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [queues, setQueues] = useState<SequenceQueue[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data?: { items?: SequenceTemplate[] }; items?: SequenceTemplate[] }>("/api/v1/bi/marketing/templates")
      .then((r) => setTemplates(r.data?.items ?? r.items ?? [])).catch(() => setTemplates([]));
    api.get<{ data?: { queues?: SequenceQueue[] }; queues?: SequenceQueue[] }>("/api/tasks/queues")
      .then((r) => setQueues(r.data?.queues ?? r.queues ?? [])).catch(() => setQueues([]));
  }, []);

  const saveSequence = async (steps: BISequenceStep[]) => {
    setBusy(true); setMessage(null);
    try {
      await api.post("/api/v1/bi/marketing/sequences", { steps });
      setMessage("Sequence saved.");
    } catch { setMessage("Save failed."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
        {(["apollo", "email", "sequences"] as const).map((key) => <button key={key} type="button" role="tab" aria-selected={channel === key} onClick={() => setChannel(key)} className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>{key === "apollo" ? "Apollo" : key === "email" ? "Email" : "Sequences"}</button>)}
      </div>
    </div>
    {channel === "apollo" ? <MarketingT /> : channel === "email" ? <div className="max-w-7xl mx-auto px-6"><BrandedEmailComposer apiBase="/api/v1/bi/marketing" /></div> : <div className="max-w-7xl mx-auto px-6">
      <SequenceCanvas silo="bi" templates={templates} queues={queues} busy={busy} onSave={(steps) => saveSequence(steps as BISequenceStep[])} />
      {message && <p className="mt-2 text-sm text-white/70">{message}</p>}
    </div>}
  </div>;
}
