import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { type Scope } from "@/api/crm";
import { postOrQueue } from "@/offline/outbox"; // BF_PORTAL_OFFLINE_OUTBOX_v251
import { logBiActivity, type CrmTarget } from "@/api/biCrmActivity"; // BF_PORTAL_v789_BI_ACTIVITY

export function NotePopup({ scope, onClose, onCreated, target = "bf" }: {
  scope: Scope; onClose: () => void; onCreated: () => void; target?: CrmTarget;
}): JSX.Element {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!body.trim() || saving) return;
    setSaving(true); setErr(null);
    try {
      if (target === "bi") await logBiActivity(scope, { event_type: "note", body: body.trim(), meta: {} });
      else await postOrQueue(`/api/crm/${scope.kind === "contact" ? "contacts" : "companies"}/${scope.id}/notes`, { body: body.trim() }, "Note");
      onCreated();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PopupShell
      title="Note"
      onClose={onClose}
      primaryAction={{
        label: saving ? "Saving…" : "Create note",
        disabled: !body.trim() || saving,
        onClick: save,
      }}
    >
      <textarea spellCheck lang="en-CA" /* BF_PORTAL_SPELLCHECK_v54 */
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start typing to leave a note…"
        rows={8}
        style={popupInputStyle}
      />
      {err && <div role="alert" style={{ color: "var(--ui-text-danger)", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
