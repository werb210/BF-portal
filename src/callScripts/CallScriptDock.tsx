// BF_PORTAL_v871_CALL_SCRIPTS - call scripts where the call happens (ported from KS-Portal #41, no plan gate): a
// "Call script" panel beside the dialler while a call is ringing or live, and a "Call scripts" section on a contact or
// application. Internal staff-to-staff calls get no panel.
import { useEffect, useState } from "react";
import { useDialer } from "@/dialer/store";
import { Section, button } from "@/settingsPack/ui";
import CallScriptRunner from "./CallScriptRunner";

/** The live call's CallSid when the Voice SDK has one. */
function callSidOf(call: unknown): string | null {
  const sid = (call as { parameters?: { CallSid?: string } } | null)?.parameters?.CallSid;
  return typeof sid === "string" && /^CA[0-9a-f]{32}$/i.test(sid) ? sid : null;
}

/** Wide screens: beside the dialler panel. Narrow ones (iPad portrait): top left, so neither covers the other. */
function useWide(): boolean {
  const query = "(min-width: 1100px)";
  const [wide, setWide] = useState(() => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : true));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return wide;
}

export function CallScriptDock() {
  const isOpen = useDialer((s) => s.isOpen);
  const minimized = useDialer((s) => s.isMinimized);
  const status = useDialer((s) => s.status);
  const ctx = useDialer((s) => s.ctx);
  const call = useDialer((s) => s.call);
  const [shown, setShown] = useState(true);
  const wide = useWide();
  const live = status === "connected" || status === "ringing" || status === "dialing";
  if (!isOpen || minimized || !live || ctx.isStaff) return null;
  const key = `${ctx.contactId ?? ""}|${ctx.applicationId ?? ""}`;
  const place = wide
    ? { right: 24 + 380 + 12, bottom: "calc(7rem + env(safe-area-inset-bottom, 0px))", width: 380, maxHeight: "calc(100vh - 48px)" }
    : { left: 16, top: 16, width: "min(380px, calc(100vw - 32px))", maxHeight: "45vh" };
  return (
    <aside aria-label="Call script" data-testid="call-script-dock" style={{
      position: "fixed", ...place, overflowY: "auto", zIndex: 1000, background: "var(--ui-surface-strong)", color: "var(--ui-text)",
      border: "1px solid var(--ui-border)", borderRadius: 16, boxShadow: "0 18px 40px rgba(0,0,0,0.35)", padding: shown ? 14 : 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 15 }}>Call script</strong>
        <button type="button" onClick={() => setShown((v) => !v)} aria-expanded={shown}
          style={{ background: "transparent", border: "1px solid var(--ui-border)", color: "var(--ui-text)", borderRadius: 8, fontSize: 13, padding: "4px 10px", cursor: "pointer" }}>
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {shown && <div style={{ marginTop: 8 }}><CallScriptRunner key={key} compact contact_id={ctx.contactId ?? null} application_id={ctx.applicationId ?? null} call_sid={callSidOf(call)} /></div>}
    </aside>
  );
}

export default function CallScriptsPanel({ contactId, applicationId }: { contactId?: string; applicationId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Section id="call-scripts" title="Call scripts" intro="Follow a script on a call and keep the answers on the timeline.">
      {open ? <CallScriptRunner contact_id={contactId ?? null} application_id={applicationId ?? null} />
        : <button type="button" onClick={() => setOpen(true)} style={button}>Open a call script</button>}
    </Section>
  );
}
