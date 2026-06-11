import { useState, type CSSProperties } from "react";
import type { Scope } from "@/api/crm";
import { NotePopup } from "./popups/NotePopup";
import O365ComposeModal from "@/components/communications/O365ComposeModal";
import { CallPopup } from "./popups/CallPopup";
import { SmsPopup } from "./popups/SmsPopup";
import { TaskPopup } from "./popups/TaskPopup";
import { MeetingPopup } from "./popups/MeetingPopup";

type Action = "note" | "email" | "call" | "sms" | "task" | "meeting";

// BF_PORTAL_BLOCK_v334_BI_ACTIONBAR_v1 — optional Edit/Delete so BI can adopt this
// shared bar without losing them; BF callers omit these props and are unchanged.
export function ActionBar({ scope, contactEmail, contactPhone, contactName, googleQuery, onChanged, onAction, onEdit, onDelete, deleting, editTestId, deleteTestId }: {
  scope: Scope;
  onAction?: (eventType: string) => void; // BF_PORTAL_BLOCK_v846_BI_EMAIL_TIMELINE
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  googleQuery?: string; // BF_PORTAL_BLOCK_v751_CRM_GOOGLE_BUTTON
  onChanged: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  editTestId?: string;
  deleteTestId?: string;
}): JSX.Element {
  const [open, setOpen] = useState<Action | null>(null);
  const close = (): void => setOpen(null);

  return (
    <>
      <div style={row}>
        {onEdit && <ActionBtn label="Edit" onClick={onEdit} testId={editTestId} />}
        {onDelete && <ActionBtn label={deleting ? "Deleting\u2026" : "Delete"} onClick={onDelete} disabled={deleting} danger testId={deleteTestId} />}
        {/* BF_PORTAL_BLOCK_v751_CRM_GOOGLE_BUTTON */}
        {(googleQuery ?? contactName) && (
          <ActionBtn
            label="Google"
            onClick={() => {
              const q = (googleQuery ?? contactName ?? "").trim();
              if (q) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
            }}
            testId="crm-google-search"
          />
        )}
        <ActionBtn label="Note" onClick={() => setOpen("note")} />
        <ActionBtn label="Email" onClick={() => setOpen("email")} />
        <ActionBtn
          label="Call"
          onClick={() => {
            if (scope.kind === "contact") {
              if (!contactPhone) { window.alert("No phone number on this contact"); return; }
              import("@/dialer/actions").then(({ startOutboundPstn }) => {
                void startOutboundPstn(contactPhone, {
                  contactId: scope.id,
                  contactName: contactName ?? null,
                  source: "actionbar",
                });
              });
              return;
            }
            setOpen("call");
          }}
        />
        {scope.kind === "contact" && (
          <ActionBtn label="SMS" onClick={() => setOpen("sms")} />
        )}
        <ActionBtn label="Task" onClick={() => setOpen("task")} />
        <ActionBtn label="Meeting" onClick={() => setOpen("meeting")} />
      </div>

      {open === "note" && (
        <NotePopup scope={scope} onClose={close} onCreated={() => { onAction?.("note"); onChanged?.(); }} />
      )}
      {open === "email" && (
        <O365ComposeModal logScope={scope} open initialTo={contactEmail ?? ""} onClose={close} onSent={() => { onAction?.("email"); onChanged?.(); }} />
      )}
      {open === "call" && scope.kind !== "contact" && (
        <CallPopup scope={scope} defaultPhone={contactPhone} onClose={close} onLogged={() => { onAction?.("call"); onChanged?.(); }} />
      )}
      {open === "sms" && scope.kind === "contact" && (
        <SmsPopup contactId={scope.id} defaultPhone={contactPhone} onClose={close} onSent={() => { onAction?.("sms"); onChanged?.(); }} />
      )}
      {open === "task" && (
        <TaskPopup scope={scope} onClose={close} onCreated={() => { onAction?.("task"); onChanged?.(); }} />
      )}
      {open === "meeting" && (
        <MeetingPopup scope={scope} defaultPhone={contactPhone} onClose={close} onCreated={() => { onAction?.("meeting"); onChanged?.(); }} />
      )}
    </>
  );
}

function ActionBtn({ label, onClick, testId, danger, disabled }: { label: string; onClick: () => void; testId?: string; danger?: boolean; disabled?: boolean }): JSX.Element {
  return <button onClick={onClick} disabled={disabled} data-testid={testId} style={danger ? { ...btn, borderColor: "#fecaca", color: "#b91c1c" } : btn}>{label}</button>;
}

const row: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const btn: CSSProperties = {
  background: "#fff", color: "#33475b", border: "1px solid #cbd6e2",
  borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 13,
};
