import { useState } from "react";
import { api } from "@/api";

// BF_PORTAL_CONTACTS_PULL_TRIGGER_v1 - trigger the server-side Outlook->CRM contact
// enrich (links existing CRM contacts to their Outlook match by email). Backs the
// previously-orphaned POST /api/o365/contacts/pull endpoint.
export default function ContactsSyncButton() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  async function sync() {
    setBusy(true);
    setNote(null);
    try {
      const res = await api.post<{ ok?: boolean; linked?: number }>("/api/o365/contacts/pull");
      const n = res?.linked ?? 0;
      setNote(`Linked ${n} contact${n === 1 ? "" : "s"} to Outlook.`);
    } catch {
      setNote("Sync failed. Make sure Microsoft 365 is connected.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--ui-border, #eaf0f6)", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Sync contacts from Outlook</h3>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted, #64748b)", marginTop: 4 }}>
        Links your existing CRM contacts to their matching Outlook contact by email, so caller ID resolves both ways.
      </p>
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--ui-border, #cbd5e1)", background: "var(--ui-surface, #f8fafc)", fontSize: 14, cursor: busy ? "default" : "pointer" }}
      >
        {busy ? "Syncing..." : "Sync now"}
      </button>
      {note && <div style={{ marginTop: 8, fontSize: 13 }}>{note}</div>}
    </div>
  );
}
