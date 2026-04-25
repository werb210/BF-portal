import { useState, type CSSProperties } from "react";
import type { Scope } from "@/api/crm";
import { NotePopup } from "./popups/NotePopup";
import { EmailPopup } from "./popups/EmailPopup";
import { CallPopup } from "./popups/CallPopup";
import { SmsPopup } from "./popups/SmsPopup";
import { TaskPopup } from "./popups/TaskPopup";
import { MeetingPopup } from "./popups/MeetingPopup";

type Action = "note" | "email" | "call" | "sms" | "task" | "meeting";

export function ActionBar({ scope, contactEmail, contactPhone, onChanged }: {
  scope: Scope;
  contactEmail?: string;
  contactPhone?: string;
  onChanged: () => void;
}): JSX.Element {
  const [open, setOpen] = useState<Action | null>(null);
  const close = (): void => setOpen(null);

  return (
    <>
      <div style={row}>
        <ActionBtn label="Note" onClick={() => setOpen("note")} />
        <ActionBtn label="Email" onClick={() => setOpen("email")} />
        <ActionBtn label="Call" onClick={() => setOpen("call")} />
        {scope.kind === "contact" && (
          <ActionBtn label="SMS" onClick={() => setOpen("sms")} />
        )}
        <ActionBtn label="Task" onClick={() => setOpen("task")} />
        <ActionBtn label="Meeting" onClick={() => setOpen("meeting")} />
      </div>

      {open === "note" && (
        <NotePopup scope={scope} onClose={close} onCreated={onChanged} />
      )}
      {open === "email" && (
        <EmailPopup scope={scope} defaultTo={contactEmail} onClose={close} onSent={onChanged} />
      )}
      {open === "call" && (
        <CallPopup scope={scope} defaultPhone={contactPhone} onClose={close} onLogged={onChanged} />
      )}
      {open === "sms" && scope.kind === "contact" && (
        <SmsPopup contactId={scope.id} defaultPhone={contactPhone} onClose={close} onSent={onChanged} />
      )}
      {open === "task" && (
        <TaskPopup scope={scope} onClose={close} onCreated={onChanged} />
      )}
      {open === "meeting" && (
        <MeetingPopup scope={scope} onClose={close} onCreated={onChanged} />
      )}
    </>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return <button onClick={onClick} style={btn}>{label}</button>;
}

const row: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const btn: CSSProperties = {
  background: "#fff", color: "#33475b", border: "1px solid #cbd6e2",
  borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 13,
};
