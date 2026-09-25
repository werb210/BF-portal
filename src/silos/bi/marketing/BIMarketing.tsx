import { useEffect, useState } from "react";
import { api } from "@/api";
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer";
import LinkClicksPanel from "@/components/marketing/LinkClicksPanel"; // BF_PORTAL_LINK_CLICKS_PANEL_v9
import SequenceCanvas, { type BISequenceStep, type SequenceQueue, type SequenceStaff, type SequenceTemplate } from "@/components/marketing/SequenceCanvas";
import SequencesTab from "./tabs/SequencesTab"; // BF_PORTAL_BI_SEQUENCES_v285

// BF_PORTAL_LINK_CLICKS_PANEL_v9 - BI gets the same link report as BF.
// BF_PORTAL_APOLLO_OFF_v10 - Apollo is retired. APOLLO_SYNC_ENABLED=false on
// BI-Server, so the tab could only ever show an empty panel - and it was the
// DEFAULT tab, so BI Marketing opened on dead content.
type Channel = "email" | "sequences" | "links";

// BF_PORTAL_SEQUENCE_CANVAS_v1 — BI mounts the shared canvas with its own API.
export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>("email"); // BF_PORTAL_APOLLO_OFF_v10
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [queues, setQueues] = useState<SequenceQueue[]>([]);
  const [staff, setStaff] = useState<SequenceStaff[]>([]);
  const [sequenceName, setSequenceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0); // v285
  // BF_PORTAL_BLOCK_v512_BI_SEQUENCE_SEND_FROM - BI sequence emails used to go out
  // from BF's submissions mailbox because no sender was ever saved. Default to
  // andrew@boreal.financial; the list adds the user's own and shared mailboxes.
  const BI_DEFAULT_SENDER = "andrew.p@boreal.financial"; // BF_PORTAL_BLOCK_v519 - andrew@ is not a real mailbox
  const [sendFrom, setSendFrom] = useState(BI_DEFAULT_SENDER);
  const [senderOptions, setSenderOptions] = useState<string[]>([BI_DEFAULT_SENDER]);

  useEffect(() => {
    // BF_PORTAL_BLOCK_v512
    api.get<{ mine?: { address?: string } | null; shared?: Array<{ address?: string }> }>("/api/crm/shared-mailboxes")
      .then((r) => {
        const found = [r?.mine?.address, ...((r?.shared ?? []).map((m) => m?.address))].filter((a): a is string => typeof a === "string" && a.includes("@"));
        setSenderOptions(Array.from(new Set([BI_DEFAULT_SENDER, ...found.map((a) => a.toLowerCase())])));
      })
      .catch(() => setSenderOptions([BI_DEFAULT_SENDER]));
  }, []);

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
      const created: any = await api.post("/api/v1/bi/marketing/sequences", { name, steps, sender_rotation: [sendFrom || BI_DEFAULT_SENDER] }); // BF_PORTAL_BLOCK_v512
      // BF_PORTAL_BLOCK_v480_BI_SEQUENCE_SAVE_STARTS - Save used to leave a draft that
      // needed a separate Start click. Start it straight away; /start keeps the
      // server-side check that no email step is empty.
      const newId: string | undefined = created?.sequence?.id ?? created?.data?.sequence?.id;
      let started = false;
      if (newId) {
        try { await api.post(`/api/v1/bi/marketing/sequences/${newId}/start`, {}); started = true; } catch { started = false; }
      }
      setMessage(started
        ? "Sequence saved and started. Add contacts from CRM → Outreach."
        : "Sequence saved but could not be started - press Start on it below.");
      setSequenceName("");
      setListVersion((v) => v + 1);
    } catch (e) {
      const detail = (e as { details?: { error?: { message?: unknown } | unknown } })?.details?.error;
      const reason = detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string" ? (detail as { message: string }).message : null;
      setMessage(reason ? `Save failed: ${reason}` : "Save failed.");
    }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
        {(["email", "sequences", "links"] as const).map((key) => <button key={key} type="button" role="tab" aria-selected={channel === key} onClick={() => setChannel(key)} className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>{key === "email" ? "Email" : key === "sequences" ? "Sequences" : "Links"}</button>)}
      </div>
    </div>
    {channel === "email" ? <div className="max-w-7xl mx-auto px-6"><BrandedEmailComposer apiBase="/api/v1/bi/marketing" /></div> : channel === "links" ? <div className="max-w-7xl mx-auto px-6"><LinkClicksPanel apiBase="/api/v1/bi/marketing" /></div> : <div className="max-w-7xl mx-auto px-6">
      <div className="mb-8"><SequencesTab hideCreate refreshKey={listVersion} /></div>
      <h3 className="mb-2 text-lg font-medium">Build a new sequence</h3>
      <label className="mb-4 block max-w-xl text-sm text-white/80">Sequence name
        <input id="bi-sequence-name" aria-label="Sequence name" value={sequenceName} onChange={(event) => setSequenceName(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2 bg-transparent text-white" placeholder="Enter a sequence name" />
      </label>
      {/* BF_PORTAL_BLOCK_v512 - who BI sequence emails come from */}
      <label className="mb-4 block max-w-xl text-sm text-white/80">Send emails from
        <select data-testid="bi-sequence-send-from" aria-label="Send emails from" value={sendFrom} onChange={(event) => setSendFrom(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2 bg-transparent text-white">
          {senderOptions.map((a) => <option key={a} value={a} className="text-black">{a}</option>)}
        </select>
      </label>
      <SequenceCanvas silo="bi" templates={templates} queues={queues} staff={staff} busy={busy} onSave={(steps) => saveSequence(steps as BISequenceStep[])} />
      {message && <p className="mt-2 text-sm text-white/70">{message}</p>}
    </div>}
  </div>;
}
