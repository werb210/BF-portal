// BF_PORTAL_v871_CALL_SCRIPTS - the "Call scripts" section on a contact or application (ported from KS-Portal #41).
// BF_PORTAL_v891_ONE_CALL_SCRIPT - the floating "Call script" box beside the dialler is gone: the dialler shows the same
// scripts in its own "Call script" fold-out (DialerPanel), where the fixed intake script used to be.
import { useState } from "react";
import { Section, button } from "@/settingsPack/ui";
import CallScriptRunner from "./CallScriptRunner";

export default function CallScriptsPanel({ contactId, applicationId }: { contactId?: string; applicationId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Section id="call-scripts" title="Call scripts" intro="Follow a script on a call and keep the answers on the timeline.">
      {open ? <CallScriptRunner contact_id={contactId ?? null} application_id={applicationId ?? null} />
        : <button type="button" onClick={() => setOpen(true)} style={button}>Open a call script</button>}
    </Section>
  );
}
