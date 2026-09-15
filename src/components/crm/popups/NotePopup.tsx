import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { type Scope } from "@/api/crm";
import { postOrQueue } from "@/offline/outbox"; // BF_PORTAL_OFFLINE_OUTBOX_v251

export function NotePopup({ scope, onClose, onCreated }: {
  scope: Scope; onClose: () => void; onCreated: () => void;
}): JSX.Element {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!body.trim() || saving) return;
    setSaving(true); setErr(null);
    try {
      await postOrQueue(`/api/crm/${scope.kind === "contact" ? "contacts" : "companies"}/${scope.id}/notes`, { body: body.trim() }, "Note");
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
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
