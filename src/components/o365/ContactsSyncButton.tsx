import { useState } from "react";
import { api } from "@/api";

// BF_PORTAL_CONTACTS_PULL_TRIGGER_v1 - trigger the server-side Outlook->CRM contact
// enrich (links existing CRM contacts to their Outlook match by email). Backs the
// previously-orphaned POST /api/o365/contacts/pull endpoint.
export function pullSummary(r: { linked?: number; scanned?: number; phonesAddedToCrm?: number; phonesAddedToOutlook?: number }): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [`Checked ${plural(r.scanned ?? 0, "Outlook contact", "Outlook contacts")}; linked ${plural(r.linked ?? 0, "CRM contact", "CRM contacts")}.`];
  if (r.phonesAddedToCrm) parts.push(`Added ${plural(r.phonesAddedToCrm, "phone number", "phone numbers")} from Outlook to the CRM.`);
  if (r.phonesAddedToOutlook) parts.push(`Added ${plural(r.phonesAddedToOutlook, "phone number", "phone numbers")} from the CRM to Outlook.`);
  return parts.join(" ");
}

export default function ContactsSyncButton() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  async function sync() {
    setBusy(true);
    setNote(null);
    try {
      // BF_PORTAL_v864_CONTACTS_PULL_FIX - report everything the sync did, and the server's reason when it could not run.
      type PullResult = { ok?: boolean; linked?: number; scanned?: number; phonesAddedToCrm?: number; phonesAddedToOutlook?: number };
      const res = await api.post<PullResult>("/api/o365/contacts/pull");
      setNote(pullSummary(res ?? {}));
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      setNote(msg && !/^request failed/i.test(msg) ? msg : "Sync failed. Make sure Microsoft 365 is connected.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--ui-border, #eaf0f6)", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Sync contacts from Outlook</h3>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted, #64748b)", marginTop: 4 }}>
        Links the CRM contacts you own to their matching Outlook contact by email, and fills a missing phone number on
        either side, so caller ID resolves both ways. Nothing is imported or overwritten.
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
