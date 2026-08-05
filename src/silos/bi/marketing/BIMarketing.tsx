import { useEffect, useState } from "react";
import { api } from "@/api";
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer";
import LinkClicksPanel from "@/components/marketing/LinkClicksPanel"; // BF_PORTAL_LINK_CLICKS_PANEL_v9
import SequenceCanvas, { type BISequenceStep, type SequenceQueue, type SequenceStaff, type SequenceTemplate } from "@/components/marketing/SequenceCanvas";
import MarketingT from "./MarketingT";

// BF_PORTAL_LINK_CLICKS_PANEL_v9 - BI gets the same link report as BF.
type Channel = "apollo" | "email" | "sequences" | "links";

// BF_PORTAL_SEQUENCE_CANVAS_v1 — BI mounts the shared canvas with its own API.
export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>("apollo");
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [queues, setQueues] = useState<SequenceQueue[]>([]);
  const [staff, setStaff] = useState<SequenceStaff[]>([]);
  const [sequenceName, setSequenceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data?: { items?: SequenceTemplate[] }; items?: SequenceTemplate[] }>("/api/v1/bi/marketing/templates")
      .then((r) => setTemplates(r.data?.items ?? r.items ?? [])).catch(() => setTemplates([]));
    api.get<{ data?: { queues?: SequenceQueue[] }; queues?: SequenceQueue[] }>("/api/tasks/queues")
      .then((r) => setQueues(r.data?.queues ?? r.queues ?? [])).catch(() => setQueues([]));
    api.get<{ users?: Array<{ id: string; first_name?: string; last_name?: string; email?: string }> } | Array<{ id: string; first_name?: string; last_name?: string; email?: string }>>("/api/users")
      .then((response) => {
        const users = Array.isArray(response) ? response : response.users ?? [];
        setStaff(users.map((user) => ({
          id: user.id,
          name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || user.id,
        })));
      }).catch(() => setStaff([]));
  }, []);

  const saveSequence = async (steps: BISequenceStep[]) => {
    const name = sequenceName.trim();
    if (!name) {
      setMessage("Sequence name is required.");
      return;
    }
    setBusy(true); setMessage(null);
    try {
      await api.post("/api/v1/bi/marketing/sequences", { name, steps });
      setMessage("Sequence saved.");
    } catch { setMessage("Save failed."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
        {(["apollo", "email", "sequences", "links"] as const).map((key) => <button key={key} type="button" role="tab" aria-selected={channel === key} onClick={() => setChannel(key)} className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>{key === "apollo" ? "Apollo" : key === "email" ? "Email" : key === "sequences" ? "Sequences" : "Links"}</button>)}
      </div>
    </div>
    {channel === "apollo" ? <MarketingT /> : channel === "email" ? <div className="max-w-7xl mx-auto px-6"><BrandedEmailComposer apiBase="/api/v1/bi/marketing" /></div> : channel === "links" ? <div className="max-w-7xl mx-auto px-6"><LinkClicksPanel apiBase="/api/v1/bi/marketing" /></div> : <div className="max-w-7xl mx-auto px-6">
      <label className="mb-4 block max-w-xl text-sm text-white/80">Sequence name
        <input id="bi-sequence-name" aria-label="Sequence name" value={sequenceName} onChange={(event) => setSequenceName(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2 bg-transparent text-white" placeholder="Enter a sequence name" />
      </label>
      <SequenceCanvas silo="bi" templates={templates} queues={queues} staff={staff} busy={busy} onSave={(steps) => saveSequence(steps as BISequenceStep[])} />
      {message && <p className="mt-2 text-sm text-white/70">{message}</p>}
    </div>}
  </div>;
}
