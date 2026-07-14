// BF_PORTAL_BLOCK_v624_DIALER_FEATURE_COMPLETE_v1 — full panel rewrite
// matching the 4 reference images (slide-in / mobile / expanded /
// connecting-with-dialpad). Single canonical state machine:
//   idle      -> dialpad + Call
//   incoming  -> Accept / Decline
//   connecting (status===dialing|ringing) -> "Connecting…" + timer +
//             Mute/End/Hold + always-visible DTMF dialpad (for IVR
//             traversal) + transcript footer
//   inCall (status===connected) -> timer + 6-button row
//             (Mute/Hold/Record/Transfer/Add/Merge) + contextual
//             expander (AddBar/TransferBar) + participant rows +
//             yellow "Recording consent" CTA + red End Call + transcript
//             footer with smart-reply chips
// Supersedes v618, v613 (which claimed a Merge button but never rendered
// it), v612, v611, v606.
import React, { useMemo, useState } from "react";
import { useDialer } from "../store";
import { dialerApi } from "../api";
import { startOutboundPstn, hangup, answerIncoming, declineIncoming } from "../actions";
import { CallTimer } from "./CallTimer";
import { ParticipantRow } from "./ParticipantRow";
import { AddParticipantBar } from "./AddParticipantBar";
import { TransferBar } from "./TransferBar";
// BF_PORTAL_BLOCK_v311_QUICK_CALL_v1
import QuickCallRow from "./QuickCallRow";

const T = {
  panelBg: "#0a0a0a",
  surface: "#141416",
  surfaceAlt: "#1c1c1f",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#f5f5f7",
  textMuted: "rgba(245,245,247,0.55)",
  textDim: "rgba(245,245,247,0.35)",
  accent: "var(--ui-accent-blue)",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  amberSoft: "rgba(245,158,11,0.16)",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
};

const I = {
  mic:      "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 12a7 7 0 0 0 14 0M12 19v3",
  micOff:   "M2 2l20 20M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M5 12a7 7 0 0 0 11.62 5.26M19 12a7 7 0 0 1-.51 2.61",
  pause:    "M6 4h4v16H6zM14 4h4v16h-4z",
  transfer: "M7 17l10-10M17 7H8M17 7v9",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6",
  merge:    "M8 2v6M16 2v6M8 8c0 4 8 4 8 8v6M16 8c0 4-8 4-8 8v6",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  hangup:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92zM2 2l20 20",
  keypad:   "M5 6h2v2H5zM11 6h2v2h-2zM17 6h2v2h-2zM5 12h2v2H5zM11 12h2v2h-2zM17 12h2v2h-2zM5 18h2v2H5zM11 18h2v2h-2zM17 18h2v2h-2z",
  record:   "M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0",
  x:        "M18 6L6 18M6 6l12 12",
};

const Icon = ({ d, size = 20, fill = "none" }: { d: string; size?: number; fill?: string }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>;

function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) {
  const initials = (name ?? "?").trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
  const hash = (name ?? "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues: Array<[number, number]> = [[210, 250], [180, 220], [330, 360], [20, 50], [140, 170], [270, 300]];
  const [h1, h2] = hues[hash % hues.length] ?? [210, 250];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, hsl(${h1} 65% 55%), hsl(${h2} 75% 45%))`, display: "grid", placeItems: "center", color: "white", fontWeight: 600, fontSize: size * 0.36, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>{initials}</div>
  );
}

function SiloChip({ silo }: { silo?: string | null }) {
  if (!silo) return null;
  const colors: Record<string, { bg: string; fg: string }> = {
    BF:  { bg: "rgba(59,130,246,0.18)",  fg: "#93c5fd" },
    BI:  { bg: "rgba(139,92,246,0.18)",  fg: "#c4b5fd" },
    SLF: { bg: "rgba(245,158,11,0.20)",  fg: "#fcd34d" },
  };
  const c = colors[silo.toUpperCase()] ?? { bg: "rgba(255,255,255,0.08)", fg: T.textMuted };
  return <span style={{ padding: "3px 9px", borderRadius: 6, background: c.bg, color: c.fg, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{silo}</span>;
}

function CtlBtn({ label, icon, active, danger, onClick, disabled }: {
  label: string; icon: string; active?: boolean; danger?: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const bg = danger ? T.red : active ? "rgba(255,255,255,0.14)" : (hover ? "rgba(255,255,255,0.06)" : "transparent");
  const border = active || danger ? "transparent" : `1.5px solid ${T.borderStrong}`;
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: 0, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      <span style={{ width: 46, height: 46, borderRadius: "50%", background: bg, border, color: T.text, display: "grid", placeItems: "center" }}>
        <Icon d={icon} size={20} />
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: T.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</span>
    </button>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
function DTMFKeypad({ onPress, compact }: { onPress: (d: string) => void; compact?: boolean }) {
  const sz = compact ? 48 : 56;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: compact ? 10 : 14, padding: compact ? "6px 32px" : "8px 32px", justifyItems: "center" }}>
      {KEYS.map((k) => (
        <button key={k} onClick={() => onPress(k)}
          style={{ width: sz, height: sz, borderRadius: "50%", background: "transparent", border: `1.5px solid ${T.border}`, color: T.text, fontSize: compact ? 19 : 22, cursor: "pointer" }}>
          {k}
        </button>
      ))}
    </div>
  );
}

function TranscriptFooter({ transcript }: { transcript: { text: string; final: boolean }[] }) {
  if (transcript.length === 0) return null;
  const tail = transcript.slice(-3).map((s) => s.text).join(" ");
  return (
    <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${T.border}`, background: T.surface }}>
      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{tail}</div>
    </div>
  );
}

function RecordingPill({ recording, paused, onToggle, disabled }: {
  recording: boolean; paused: boolean; onToggle: () => void; disabled?: boolean;
}) {
  const label = !recording ? "Recording consent" : paused ? "Recording paused" : "Recording";
  return (
    <button
      onClick={onToggle} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "9px 16px", borderRadius: 999,
        background: T.amberSoft, border: `1px solid ${T.amber}40`,
        color: T.amber, fontSize: 12, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.amber, opacity: paused ? 0.4 : 1 }} />
      {label}
    </button>
  );
}

type ScriptSection = { n: string; title: string; say?: string[]; capture?: string; note?: string };

const INTAKE_SCRIPT: ScriptSection[] = [
  { n: "0", title: "Recording consent (read first)",
    say: [`This call is recorded for quality and accuracy. Is that okay to continue?`],
    capture: `recording_consent (yes/no)`,
    note: `If no: stop recording, offer unrecorded or a secure link, log the refusal.` },
  { n: "1", title: "Greeting",
    say: [`Thank you for calling Boreal Financial. My name is ___ - how can I help you today?`,
          `If financing: I will ask a few quick questions to match you with the lenders and products most likely to approve - about five minutes.`] },
  { n: "2", title: "Contact and business identity",
    say: [`Your full name? Company name? Your position with the company?`,
          `Is the business incorporated, a sole proprietorship, or a partnership?`,
          `Are you the sole owner, or are there other owners or partners?`,
          `Best mobile number? (this is also the number used to access the secure application)`,
          `Best email address?`],
    capture: `contact_name, business_name, title, entity_type, ownership, phone (login), email` },
  { n: "3", title: "Business profile",
    say: [`In a sentence, what does the company do?`,
          `How long operating? Which province and city? How many employees?`],
    capture: `description, time_in_business, province/city, employees` },
  { n: "4", title: "Funding request",
    say: [`How much funding are you looking for?`,
          `READ BACK: So that is $___, correct?`,
          `What will the funds be used for? (working capital, equipment, expansion, inventory, payroll, acquisition, commercial real estate, debt consolidation, media/entertainment, factoring/receivables, purchase orders, other)`],
    capture: `amount_requested (read back), use_of_funds (drives routing)` },
  { n: "5", title: "Timing",
    say: [`When do you need the funds? (immediately / within 30 days / 1-3 months / just exploring)`],
    capture: `urgency` },
  { n: "6", title: "Existing financing",
    say: [`Any of these in place now? Bank/term loans, lines of credit, merchant cash advances, equipment leases, factoring, government loans (CSBFP/BDC).`],
    capture: `existing_debt (all that apply)` },
  { n: "7", title: "Financial overview",
    say: [`Approximate annual revenue last year?`,
          `READ BACK: So roughly $___, correct?`,
          `Is the business currently profitable?`,
          `Any bankruptcies, consumer proposals, CRA/tax arrears, or judgments - business or owners?`],
    capture: `annual_revenue (read back), profitable, credit_issues` },
  { n: "8", title: "Collateral",
    say: [`Any assets to support the financing? Equipment, real estate, accounts receivable, inventory, or none.`],
    capture: `collateral (all that apply)` },
  { n: "9", title: "Route-specific (ask the matching block)",
    say: [`Media: signed contracts, broadcaster/distribution agreements, or approved tax credits?`,
          `Real estate: property type, approximate value, owned or being purchased?`,
          `Equipment: what equipment, approximate cost, new or used?`,
          `Factoring: main customers and outstanding receivables?`],
    capture: `route-specific detail` },
  { n: "10", title: "Decision-makers",
    say: [`Will all decision-makers and owners be available to take part?`],
    capture: `decision_makers_available` },
  { n: "11", title: "Documents and secure link",
    say: [`We will typically need recent financial statements, bank statements, government ID, and corporate documents.`,
          `Nothing to send now - I will text a secure link to your mobile; you upload there and complete the application. It is protected by a one-time code sent to your phone.`],
    capture: `consent_to_contact (CASL, yes) to text/email the link` },
  { n: "12", title: "Appointment and next steps",
    say: [`Want a specialist to call at a particular time, or is now-onward fine?`,
          `Once reviewed, a specialist reaches out with next steps and the strongest-fit lenders.`],
    capture: `preferred_callback` },
  { n: "13", title: "Close",
    say: [`Anything else you would like us to know before we begin?`,
          `Thank you - sending your secure link now; we will begin reviewing right away.`],
    capture: `notes` },
];

const AGENT_NOTES: string[] = [
  "Read back amount and revenue before recording them.",
  "Use of funds drives routing: media -> Media Funding, equipment -> Equipment, factoring -> Factoring, real estate -> Commercial Mortgage, general -> Working Capital, POs -> PO, new business -> Startup.",
  "$1M+ routes to the senior broker queue.",
  "No documents by voice - always the secure OTP link.",
];

function IntakeScript() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", background: "transparent", border: "none", color: T.text, cursor: "pointer" }}
        title="Toggle intake script" aria-expanded={open}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.textMuted }}>Intake script</span>
        <span style={{ display: "grid", placeItems: "center", color: T.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <Icon d="M6 9l6 6 6-6" size={16} />
        </span>
      </button>
      {open && (
        <div style={{ maxHeight: 260, overflowY: "auto", padding: "0 20px 14px" }}>
          {INTAKE_SCRIPT.map((s) => (
            <div key={s.n} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, minWidth: 16 }}>{s.n}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.title}</span>
              </div>
              {s.say?.map((line, i) => (
                <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45, color: T.text, marginLeft: 24, marginBottom: 3 }}>{line}</div>
              ))}
              {s.capture ? (
                <div style={{ fontSize: 11, lineHeight: 1.4, color: T.textMuted, marginLeft: 24, marginTop: 2 }}>Capture: {s.capture}</div>
              ) : null}
              {s.note ? (
                <div style={{ fontSize: 11, lineHeight: 1.4, color: T.textDim, marginLeft: 24, marginTop: 2, fontStyle: "italic" }}>{s.note}</div>
              ) : null}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 4, paddingTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>Agent notes</div>
            {AGENT_NOTES.map((nt, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.4, color: T.textDim, marginBottom: 3 }}>- {nt}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Expander = "none" | "keypad" | "add" | "merge" | "transfer";

export default function DialerPanel() {
  const st = useDialer();
  const [phone, setPhone] = useState("");
  const [expander, setExpander] = useState<Expander>("none");

  const conf = st.conference;
  const me = useMemo(
    () => st.participants.find((p) => p.role === "moderator"),
    [st.participants],
  );
  const others = useMemo(
    () => st.participants.filter((p) => p.id !== me?.id && p.status === "joined"),
    [st.participants, me],
  );

  const inCall            = st.status === "connected";
  const connecting        = st.status === "dialing" || st.status === "ringing";
  const liveAny           = inCall || connecting;
  const incoming          = st.incoming;
  const recording         = !!conf?.recording_sid;
  const recordingPaused   = !!conf?.recording_paused;

  if (!st.isOpen && !liveAny && !incoming) return null;

  const headline = st.ctx.contactName || others[0]?.display_name || (connecting ? "Connecting…" : "New call");
  const subline  = st.ctx.applicationName || others[0]?.phone_number || st.ctx.phone || "";
  const silo     = conf?.silo;

  // DTMF: during live call, send through the SDK; in idle, build a number.
  const dtmf = (d: string) => {
    if (st.call) {
      try { (st.call as { sendDigits?: (digits: string) => void }).sendDigits?.(d); } catch { /* best-effort */ }
    } else {
      setPhone((p) => p + d);
    }
  };

  const toggleRecording = async () => {
    if (!conf) return;
    if (!conf.recording_sid) {
      // No recording in progress. The server-side gate is
      // ENABLE_CALL_RECORDING=true (v654). If it's off the API will
      // surface a useful error; we don't pre-check here.
      try { await dialerApi.recording(conf.id, "resume"); } catch { /* best-effort */ }
      return;
    }
    try { await dialerApi.recording(conf.id, recordingPaused ? "resume" : "pause"); } catch { /* best-effort */ }
  };

  const closePanel = () => {
    if (liveAny) { try { hangup(); } catch { /* best-effort */ } }
    st.close();
    setExpander("none");
    setPhone("");
  };

  const setExp = (next: Expander) => setExpander((cur) => (cur === next ? "none" : next));

  return (
    <div style={{
      position: "fixed", right: 24, bottom: "calc(7rem + env(safe-area-inset-bottom, 0px))", width: 380,
      background: T.panelBg, color: T.text, borderRadius: 28, overflow: "hidden",
      border: `1px solid ${T.border}`,
      boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.4)",
      fontFamily: T.font, zIndex: 1000, maxHeight: "calc(100vh - 48px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* HEADER */}
      <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <Avatar name={headline} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{headline}</div>
          <div style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subline}</div>
        </div>
        <SiloChip silo={silo} />
        {st.ctx.contactId && (
          <a href={`/crm/contacts/${st.ctx.contactId}`}
             style={{ fontSize: 11, color: T.text, textDecoration: "none", padding: "5px 10px", borderRadius: 8, border: `1px solid ${T.borderStrong}`, whiteSpace: "nowrap" }}>
            Open Contact
          </a>
        )}
        <button onClick={closePanel}
          style={{ background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8 }}
          title="Close dialer" aria-label="Close dialer">
          <Icon d={I.x} size={18} />
        </button>
      </div>

      {/* INCOMING */}
      {incoming && !liveAny && (
        <div style={{ padding: "24px 20px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>Incoming call</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>{incoming.fromDisplay}</div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 22 }}>
            <button onClick={declineIncoming}
              style={{ width: 60, height: 60, borderRadius: "50%", background: T.red, border: "none", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}
              title="Decline" aria-label="Decline">
              <Icon d={I.hangup} size={24} />
            </button>
            <button onClick={answerIncoming}
              style={{ width: 60, height: 60, borderRadius: "50%", background: T.green, border: "none", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}
              title="Accept" aria-label="Accept">
              <Icon d={I.phone} size={24} />
            </button>
          </div>
        </div>
      )}

      {/* CONNECTING (dialing/ringing) — image 4 layout */}
      {connecting && !incoming && (
        <>
          <div style={{ padding: "16px 20px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {st.status === "ringing" ? "Ringing" : "Connecting"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 400, fontFamily: T.mono, marginTop: 4 }}>
              {st.ctx.phone || subline || "—"}
            </div>
          </div>
          <DTMFKeypad onPress={dtmf} compact />
          <div style={{ display: "flex", gap: 28, justifyContent: "center", padding: "8px 0 18px" }}>
            <CtlBtn label="Mute" icon={me?.muted ? I.micOff : I.mic} active={!!me?.muted}
              onClick={() => me && conf && dialerApi.muteParticipant(conf.id, me.id, !me.muted)}
              disabled={!me || !conf} />
            <button onClick={hangup}
              style={{ width: 64, height: 64, borderRadius: "50%", background: T.red, border: "none", color: "white", cursor: "pointer", display: "grid", placeItems: "center", alignSelf: "center" }}
              title="End call" aria-label="End call">
              <Icon d={I.hangup} size={24} />
            </button>
            <CtlBtn label="Hold" icon={I.pause} active={!!me?.on_hold}
              onClick={() => me && conf && dialerApi.holdParticipant(conf.id, me.id, !me.on_hold)}
              disabled={!me || !conf} />
          </div>
          <IntakeScript />
          <TranscriptFooter transcript={st.transcript} />
        </>
      )}

      {/* IN CALL (connected) — image 1 layout */}
      {inCall && !incoming && (
        <>
          <div style={{ padding: "16px 20px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 300, fontFamily: T.mono }}>
              <CallTimer startedAt={conf?.started_at ?? st.callStartedAt} />
            </div>
          </div>

          {/* 6-button control row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, padding: "14px 14px 6px" }}>
            <CtlBtn label="Mute"     icon={me?.muted ? I.micOff : I.mic} active={!!me?.muted}
              onClick={() => me && conf && dialerApi.muteParticipant(conf.id, me.id, !me.muted)}
              disabled={!me || !conf} />
            <CtlBtn label="Hold"     icon={I.pause} active={!!me?.on_hold}
              onClick={() => me && conf && dialerApi.holdParticipant(conf.id, me.id, !me.on_hold)}
              disabled={!me || !conf} />
            <CtlBtn label="Record"   icon={I.record} active={recording && !recordingPaused}
              onClick={toggleRecording} />
            <CtlBtn label="Transfer" icon={I.transfer} active={expander === "transfer"}
              onClick={() => setExp("transfer")} disabled={!conf} />
            <CtlBtn label="Add"      icon={I.userPlus} active={expander === "add"}
              onClick={() => setExp("add")} disabled={!conf} />
            <CtlBtn label="Merge"    icon={I.merge} active={expander === "merge"}
              onClick={() => setExp("merge")} disabled={!conf} />
          </div>

          {/* Contextual expander */}
          {expander === "keypad"   && <DTMFKeypad onPress={dtmf} compact />}
          {expander === "add"      && conf && <AddParticipantBar conferenceId={conf.id} />}
          {expander === "merge"    && conf && <AddParticipantBar conferenceId={conf.id} />}
          {expander === "transfer" && conf && <TransferBar conferenceId={conf.id} initiatorPid={me?.id ?? null} />}

          {/* Participants */}
          {others.length > 0 && (
            <div style={{ padding: "4px 18px 0" }}>
              {others.map((p) => (
                <ParticipantRow key={p.id} p={p} canModerate={Boolean(conf)}
                  onMute={() => conf && dialerApi.muteParticipant(conf.id, p.id, !p.muted)}
                  onHold={() => conf && dialerApi.holdParticipant(conf.id, p.id, !p.on_hold)}
                  onKick={() => conf && dialerApi.kickParticipant(conf.id, p.id)} />
              ))}
            </div>
          )}

          {/* Recording consent / End row */}
          <div style={{ padding: "14px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <RecordingPill recording={recording} paused={recordingPaused} onToggle={toggleRecording} disabled={!conf} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setExp("keypad")}
                style={{ width: 44, height: 44, borderRadius: "50%", background: expander === "keypad" ? "rgba(255,255,255,0.14)" : "transparent", border: `1.5px solid ${T.borderStrong}`, color: T.text, cursor: "pointer", display: "grid", placeItems: "center" }}
                title="Keypad" aria-label="Keypad">
                <Icon d={I.keypad} size={18} />
              </button>
              <button onClick={hangup}
                style={{ width: 48, height: 48, borderRadius: "50%", background: T.red, border: "none", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}
                title="End call" aria-label="End call">
                <Icon d={I.hangup} size={20} />
              </button>
            </div>
          </div>

          <IntakeScript />
          <TranscriptFooter transcript={st.transcript} />
        </>
      )}

      {/* IDLE — dialpad to place a new call */}
      {!liveAny && !incoming && (
        <>
          {(st.status === "error" || (!st.device && st.status !== "preflight")) && (
            <div style={{ margin: "12px 20px 0", padding: "10px 12px", borderRadius: 10, background: T.amberSoft, border: `1px solid ${T.amber}`, color: T.text, fontSize: 12, lineHeight: 1.4 }}>
              <strong>Phone not ready.</strong>{" "}
              {st.error === "no_voice_token" ? "Could not get a voice token from the server."
                : st.error === "device_not_registered" ? "The phone engine did not finish registering — reload the page."
                : st.error === "mic_permission_denied" ? "Microphone permission is blocked — allow it in the browser, then reload."
                : st.error === "bootstrap_failed" ? "The dialer failed to start. Reload the page; if it persists, the voice service is down."
                : st.error ? `Reason: ${st.error}`
                : "The phone engine has not registered yet — reload the page."}
            </div>
          )}
          <div style={{ padding: "18px 20px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>Enter a number</div>
            <div style={{ fontSize: 28, fontFamily: T.mono, marginTop: 6, minHeight: 36 }}>{phone || "+1"}</div>
          </div>
          <div style={{ padding: "0 24px 8px" }}>
            {/* DIALER_NO_INPUT_v1 -- password managers (iCloud Passwords, 1Password,
                LastPass) attach to any focused text input and ignore autocomplete="off"
                and the data-*-ignore hints. The only reliable fix is to not use an
                <input> at all. This is a focusable div that captures keystrokes and
                paste directly, so there is no form field for a manager to bind to. */}
            <div
              role="textbox"
              aria-label="Phone number"
              tabIndex={0}
              ref={(el) => { if (el && document.activeElement !== el) el.focus(); }}
              onKeyDown={(e) => {
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                if (e.key === "Enter") { e.preventDefault(); void startOutboundPstn(phone, st.ctx); return; }
                if (e.key === "Backspace") { e.preventDefault(); setPhone((prev) => prev.slice(0, -1)); return; }
                if (e.key === "Escape") { e.preventDefault(); setPhone(""); return; }
                if (e.key.length === 1 && /[0-9+*#]/.test(e.key)) { e.preventDefault(); setPhone((prev) => prev + e.key); }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const raw = e.clipboardData.getData("text") || "";
                const cleaned = raw.replace(/[^0-9+]/g, "");
                if (cleaned) setPhone((prev) => prev + cleaned);
              }}
              style={{
                width: "100%", borderRadius: 10, border: `1px solid ${T.borderStrong}`,
                background: T.surfaceAlt, color: phone ? T.text : T.textMuted,
                padding: "10px 12px", minHeight: 20, cursor: "text",
                fontFamily: T.mono, outline: "none", userSelect: "none",
              }}
            >
              {phone || "+1..."}
            </div>
          </div>
          <QuickCallRow />
          <DTMFKeypad onPress={(d) => setPhone((p) => p + d)} />
          <div style={{ padding: "6px 24px 22px", display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
            <button onClick={() => setPhone((p) => p.slice(0, -1))}
              style={{ background: "transparent", border: "none", color: T.textMuted, fontSize: 12, cursor: "pointer", padding: "8px 10px" }}>
              Delete
            </button>
            <button
              onClick={() => startOutboundPstn(phone, st.ctx)}
              disabled={!phone.trim() || !st.device}
              style={{ width: 64, height: 64, borderRadius: "50%", background: T.green, border: "none", color: "white", cursor: (!phone.trim() || !st.device) ? "not-allowed" : "pointer", opacity: (!phone.trim() || !st.device) ? 0.45 : 1, display: "grid", placeItems: "center", boxShadow: "0 6px 20px rgba(16,185,129,0.4)" }}
              title="Call" aria-label="Call">
              <Icon d={I.phone} size={24} />
            </button>
            <button onClick={() => setPhone("")}
              style={{ background: "transparent", border: "none", color: T.textMuted, fontSize: 12, cursor: "pointer", padding: "8px 10px" }}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
