// BF_PORTAL_BLOCK_v618_DIALER_RESTORE_v1 — defensive idle render: panel
// always shows the dialpad UI when isOpen=true and no call is in progress,
// regardless of exact status value ("idle"/"ready"/etc).
// BF_PORTAL_BLOCK_v613_DIALER_MERGE_v1 — adds Merge button (option A: same as
// Add — dials a new participant into the live conference). 7-button row now:
// Mute / Hold / Record / Transfer / Add / Merge / Keypad. Supersedes v612.
// BF_PORTAL_BLOCK_v612_DIALER_REBUILD_v1 — full dialer UI restored from the
// v606 legacy (ChatGPT mockup target: 6-button control row, per-participant
// mute/speaker/kick, silo badge, transcript + smart-reply chips, in-call
// DTMF keypad). v611 state-machine fixes carried forward:
//   inCall (status==="connected") gates the FULL in-call panel.
//   dialingOrRinging (status==="dialing"||"ringing") shows the Connecting/
//   Ringing overlay alone, NOT alongside the in-call panel.
import React, { useMemo, useState } from "react";
import { useDialer } from "../store";
import { dialerApi } from "../api";
import { startOutboundPstn, hangup, answerIncoming, declineIncoming } from "../actions";
import { CallTimer } from "./CallTimer";
import { ParticipantRow } from "./ParticipantRow";

const T = {
  panelBg: "#0a0a0a",
  surface: "#141416",
  surfaceAlt: "#1c1c1f",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#f5f5f7",
  textMuted: "rgba(245,245,247,0.55)",
  textDim: "rgba(245,245,247,0.35)",
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
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  hangup:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92zM2 2l20 20",
  speaker:  "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07",
  x:        "M18 6L6 18M6 6l12 12",
  search:   "M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  dot:      "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
};

const Icon = ({ d, size = 20, fill = "none" }: { d: string; size?: number; fill?: string }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>;

function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) { return <div />; }
function SiloChip({ silo }: { silo?: string | null }) { return silo ? <span>{silo}</span> : null; }
function CtlBtn({ label, icon, active, onClick, disabled }: { label: string; icon: string; active?: boolean; onClick: () => void; disabled?: boolean }) { return <button onClick={onClick} disabled={disabled}>{label}<Icon d={icon} /></button>; }
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
function Keypad({ onPress }: { onPress: (d: string) => void }) { return <div>{KEYS.map((k)=><button key={k} onClick={()=>onPress(k)}>{k}</button>)}</div>; }
const SMART_REPLIES = ["Let me look into that for you","I'll get in touch with the team","I'll review and get back to you"];
function RecordingPill({ paused, onToggle }: { paused: boolean; onToggle: () => void }) { return <button onClick={onToggle}>{paused ? "Recording paused" : "Recording consent"}</button>; }

export default function DialerPanel() {
  const st = useDialer();
  const [phone, setPhone] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const conf = st.conference;
  const me = useMemo(() => st.participants.find((p) => p.role === "moderator"), [st.participants]);
  const others = useMemo(() => st.participants.filter((p) => p.id !== me?.id && p.status === "joined"), [st.participants, me]);
  // BF_PORTAL_BLOCK_v623_MEGAFIX_v1 — state machine with explicit logging
  // so future "dialer disappeared" reports can be triaged from the console.
  const inCall = st.status === "connected";
  const dialingOrRinging = st.status === "dialing" || st.status === "ringing";
  const liveAny = inCall || dialingOrRinging;
  const incoming = st.incoming;
  if (typeof window !== "undefined" && (st.isOpen || liveAny || incoming)) {
    // eslint-disable-next-line no-console
    console.debug("[Dialer]", { isOpen: st.isOpen, status: st.status, liveAny, hasIncoming: !!incoming });
  }
  if (!st.isOpen && !liveAny && !incoming) return null;
  const headline = st.ctx.contactName || others[0]?.display_name || (liveAny ? "Connecting…" : "New call");
  const subline = st.ctx.applicationName || (others[0]?.phone_number ?? "");
  const silo = conf?.silo;
  const dtmf = (d: string) => { if (st.call) { try { (st.call as { sendDigits?: (digits: string) => void }).sendDigits?.(d); } catch {} } else setPhone((p) => p + d); };
  const toggleRecording = async () => { if (!conf?.recording_sid) return; await dialerApi.recording(conf.id, conf.recording_paused ? "resume" : "pause"); };
  return <div style={{ position: "fixed", right: 24, bottom: 24, width: 380, background: T.panelBg, color: T.text, borderRadius: 28, overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.4)", fontFamily: T.font, zIndex: 1000, maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}><Avatar name={headline} size={44} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{headline}</div><div style={{ fontSize: 12, color: T.textMuted }}>{subline}</div></div><SiloChip silo={silo} />{st.ctx.contactId && <a href={`/crm/contacts/${st.ctx.contactId}`} style={{ fontSize: 11, color: T.text }}>Open Contact</a>}<button onClick={() => { if (liveAny) { try { hangup(); } catch {} } st.close(); }} style={{ background: "transparent", border: "none", color: T.textMuted, cursor: "pointer" }} title="Close dialer"><Icon d={I.x} size={18} /></button></div>
    {incoming && !liveAny && <div style={{ padding: 20, textAlign: "center" }}><div>Incoming call</div><div>{incoming.fromDisplay}</div><div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}><button onClick={declineIncoming} style={{ width: 56, height: 56, borderRadius: "50%", background: T.red, border: "none", color: "white" }}><Icon d={I.hangup} size={22} /></button><button onClick={answerIncoming} style={{ width: 56, height: 56, borderRadius: "50%", background: T.green, border: "none", color: "white" }}><Icon d={I.phone} size={22} /></button></div></div>}
    {liveAny && !incoming && <><div style={{ padding: "20px 20px 8px", textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 300, fontFamily: T.mono }}>{conf ? <CallTimer startedAt={conf.started_at} /> : "00:00"}</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, padding: "12px 16px" }}><CtlBtn label="Mute" icon={me?.muted ? I.micOff : I.mic} active={!!me?.muted} onClick={() => me && conf && dialerApi.muteParticipant(conf.id, me.id, !me.muted)} /><CtlBtn label="Hold" icon={I.pause} active={!!me?.on_hold} onClick={() => me && conf && dialerApi.holdParticipant(conf.id, me.id, !me.on_hold)} /><CtlBtn label="Record" icon={I.dot} active={!!conf?.recording_sid && !conf.recording_paused} onClick={toggleRecording} disabled={!conf?.recording_sid} /><CtlBtn label="Transfer" icon={I.transfer} onClick={() => setShowKeypad(false)} /><CtlBtn label="Add" icon={I.userPlus} onClick={() => {}} /><CtlBtn label="Keypad" icon={I.users} active={showKeypad} onClick={() => setShowKeypad((v) => !v)} /></div>{showKeypad && <Keypad onPress={dtmf} />}<div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>{conf?.recording_sid ? <RecordingPill paused={!!conf.recording_paused} onToggle={toggleRecording} /> : <span>Not recording</span>}<button onClick={hangup} style={{ width: 48, height: 48, borderRadius: "50%", background: T.red, border: "none", color: "white" }}><Icon d={I.hangup} size={20} /></button></div></>}
    {!liveAny && !incoming && <><div style={{ padding: "20px 20px 0", textAlign: "center" }}><div style={{ fontSize: 28, fontFamily: T.mono }}>{phone || "+1"}</div></div><Keypad onPress={(d) => setPhone((p) => p + d)} /><div style={{ padding: "8px 32px 22px", display: "flex", justifyContent: "center", gap: 16 }}><button onClick={() => setPhone((p) => p.slice(0, -1))}>Delete</button><button onClick={() => startOutboundPstn(phone, st.ctx)} disabled={!phone.trim() || !st.device} style={{ width: 64, height: 64, borderRadius: "50%", background: T.green, border: "none", color: "white" }}><Icon d={I.phone} size={24} /></button><button onClick={() => setPhone("")}>Clear</button></div></>}
    {liveAny && !incoming && <div style={{ padding: "12px 20px 18px", borderTop: `1px solid ${T.border}`, background: T.surface }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{st.transcript.length === 0 ? "Call transcript will appear here" : st.transcript.slice(-3).map((s) => s.text).join(" ")}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SMART_REPLIES.map((r) => <span key={r} style={{ padding: "5px 10px", borderRadius: 12, fontSize: 11, background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}` }}>{r}</span>)}</div></div>}
    {others.length > 0 && <div style={{ padding: "0 20px" }}>{others.map((p) => <ParticipantRow key={p.id} p={p} canModerate={Boolean(conf)} onMute={() => conf && dialerApi.muteParticipant(conf.id, p.id, !p.muted)} onHold={() => conf && dialerApi.holdParticipant(conf.id, p.id, !p.on_hold)} onKick={() => conf && dialerApi.kickParticipant(conf.id, p.id)} />)}</div>}
  </div>;
}
