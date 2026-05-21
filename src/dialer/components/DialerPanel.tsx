// BF_PORTAL_BLOCK_v606_DIALER_UI_v1
import React, { useMemo, useState } from "react";
import { useDialer } from "../store";
import { dialerApi } from "../api";
import { startOutboundPstn, hangup, answerIncoming, declineIncoming } from "../actions";
import { CallTimer } from "./CallTimer";

// ────────────────────────────────────────────────────────────────────────────
// Design tokens (self-contained — no Tailwind dependency)
// ────────────────────────────────────────────────────────────────────────────
const T = {
  panelBg: "#0a0a0a",
  surface: "#141416",
  surfaceAlt: "#1c1c1f",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#f5f5f7",
  textMuted: "rgba(245,245,247,0.55)",
  textDim: "rgba(245,245,247,0.35)",
  accent: "#3b82f6",
  accentSoft: "rgba(59,130,246,0.15)",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  amberSoft: "rgba(245,158,11,0.16)",
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
};

// ── Icons (tiny inline SVGs to avoid emoji rendering inconsistencies) ──
const Icon = ({ d, size = 20, fill = "none" }: { d: string; size?: number; fill?: string }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>;
const I = {
  mic:      "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 12a7 7 0 0 0 14 0M12 19v3",
  micOff:   "M2 2l20 20M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M5 12a7 7 0 0 0 11.62 5.26M19 12a7 7 0 0 1-.51 2.61",
  pause:    "M6 4h4v16H6zM14 4h4v16h-4z",
  rec:      "",
  transfer: "M7 17l10-10M17 7H8M17 7v9",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  hangup:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92zM2 2l20 20",
  speaker:  "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07",
  speakerX: "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6",
  x:        "M18 6L6 18M6 6l12 12",
  search:   "M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
  dot:      "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
};

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
  const colors: Record<string, { bg: string; fg: string }> = { BF: { bg: "rgba(59,130,246,0.18)", fg: "#93c5fd" }, BI: { bg: "rgba(139,92,246,0.18)", fg: "#c4b5fd" }, SLF: { bg: "rgba(245,158,11,0.20)", fg: "#fcd34d" } };
  const c = colors[silo.toUpperCase()] ?? { bg: "rgba(255,255,255,0.08)", fg: T.textMuted };
  return <span style={{ padding: "3px 9px", borderRadius: 6, background: c.bg, color: c.fg, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{silo}</span>;
}

function CtlBtn({ label, icon, active, danger, onClick, disabled }: { label: string; icon: string; active?: boolean; danger?: boolean; onClick: () => void; disabled?: boolean; }) {
  const [hover, setHover] = useState(false);
  const bg = danger ? T.red : active ? "rgba(255,255,255,0.12)" : (hover ? "rgba(255,255,255,0.06)" : "transparent");
  const border = active || danger ? "transparent" : `1.5px solid ${T.borderStrong}`;
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: 0, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      <span style={{ width: 48, height: 48, borderRadius: "50%", background: bg, border, color: T.text, display: "grid", placeItems: "center" }}><Icon d={icon} size={20} /></span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: T.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</span>
    </button>
  );
}
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
function Keypad({ onPress }: { onPress: (d: string) => void }) { return <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "8px 32px" }}>{KEYS.map((k) => <button key={k} onClick={() => onPress(k)} style={{ width: 60, height: 60, borderRadius: "50%", background: "transparent", border: `1.5px solid ${T.border}`, color: T.text, fontSize: 22, cursor: "pointer", justifySelf: "center" }}>{k}</button>)}</div>; }
const SMART_REPLIES = ["Let me look into that for you", "I'll get in touch with the team", "I'll review and get back to you"];
function RecordingPill({ paused, onToggle }: { paused: boolean; onToggle: () => void }) { return <button onClick={onToggle} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, background: T.amberSoft, border: `1px solid ${T.amber}40`, color: T.amber, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: T.amber }} />{paused ? "Recording paused" : "Recording consent"}</button>; }
function ParticipantRow({ name, durationSec, muted, isMe, onMute, onSpeaker, onKick }: { name: string; durationSec?: number; muted?: boolean; isMe?: boolean; onMute?: () => void; onSpeaker?: () => void; onKick?: () => void; }) { const mm = Math.floor((durationSec ?? 0) / 60).toString().padStart(2, "0"); const ss = Math.floor((durationSec ?? 0) % 60).toString().padStart(2, "0"); return <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}><Avatar name={name} size={36} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: T.text, fontSize: 14, fontWeight: 500 }}>{name}{isMe && <span style={{ color: T.textDim, fontSize: 11 }}> (you)</span>}</div><div style={{ color: T.textDim, fontSize: 11, fontFamily: T.mono }}>{mm}:{ss}</div></div><div style={{ display: "flex", gap: 12, color: muted ? T.textDim : T.text }}><button onClick={onMute} style={iconBtn}><Icon d={muted ? I.micOff : I.mic} size={16} /></button><button onClick={onSpeaker} style={iconBtn}><Icon d={I.speaker} size={16} /></button><button onClick={onKick} style={iconBtn}><Icon d={I.user} size={16} /></button></div></div>; }
const iconBtn: React.CSSProperties = { background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 4 };

export default function DialerPanel() {
  const st = useDialer();
  const [phone, setPhone] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const conf = st.conference;
  const me = useMemo(() => st.participants.find((p) => p.role === "moderator"), [st.participants]);
  const others = useMemo(() => st.participants.filter((p) => p.id !== me?.id && p.status === "joined"), [st.participants, me]);
  const live = st.status === "connected" || st.status === "ringing" || st.status === "dialing";
  const incoming = st.incoming;
  if (!st.isOpen && !live && !incoming) return null;
  const headline = st.ctx.contactName || others[0]?.display_name || (live ? "Connecting…" : "New call");
  const subline = st.ctx.applicationName || (others[0]?.phone_number ?? "");
  const silo = conf?.silo;
  const dtmf = (d: string) => { if (st.call) { try { (st.call as any).sendDigits?.(d); } catch {} } else setPhone((p) => p + d); };
  const toggleRecording = async () => { if (!conf?.recording_sid) return; await dialerApi.recording(conf.id, conf.recording_paused ? "resume" : "pause"); };
  return <div style={{ position: "fixed", right: 24, bottom: 24, width: 380, background: T.panelBg, color: T.text, borderRadius: 28, overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.4)", fontFamily: T.font, zIndex: 1000, maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}><Avatar name={headline} size={44} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{headline}</div><div style={{ fontSize: 12, color: T.textMuted }}>{subline}</div></div><SiloChip silo={silo} />{st.ctx.contactId && <a href={`/crm/contacts/${st.ctx.contactId}`} style={{ fontSize: 11, color: T.text }}>Open Contact</a>}<button onClick={() => st.close()} style={{ background: "transparent", border: "none", color: T.textMuted }}><Icon d={I.x} size={18} /></button></div>
    {incoming && !live && <div style={{ padding: 20, textAlign: "center" }}><div>Incoming call</div><div>{incoming.fromDisplay}</div><div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}><button onClick={declineIncoming} style={{ width: 56, height: 56, borderRadius: "50%", background: T.red, border: "none", color: "white" }}><Icon d={I.hangup} size={22} /></button><button onClick={answerIncoming} style={{ width: 56, height: 56, borderRadius: "50%", background: T.green, border: "none", color: "white" }}><Icon d={I.phone} size={22} /></button></div></div>}
    {live && !incoming && <><div style={{ padding: "20px 20px 8px", textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 300, fontFamily: T.mono }}>{conf ? <CallTimer startedAt={conf.started_at} /> : "00:00"}</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, padding: "12px 16px" }}><CtlBtn label="Mute" icon={me?.muted ? I.micOff : I.mic} active={!!me?.muted} onClick={() => me && conf && dialerApi.muteParticipant(conf.id, me.id, !me.muted)} /><CtlBtn label="Hold" icon={I.pause} active={!!me?.on_hold} onClick={() => me && conf && dialerApi.holdParticipant(conf.id, me.id, !me.on_hold)} /><CtlBtn label="Record" icon={I.dot} active={!!conf?.recording_sid && !conf.recording_paused} onClick={toggleRecording} disabled={!conf?.recording_sid} /><CtlBtn label="Transfer" icon={I.transfer} onClick={() => setShowKeypad(false)} /><CtlBtn label="Add" icon={I.userPlus} onClick={() => {}} /><CtlBtn label="Keypad" icon={I.users} active={showKeypad} onClick={() => setShowKeypad((v) => !v)} /></div>{showKeypad && <Keypad onPress={dtmf} />}<div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>{conf?.recording_sid ? <RecordingPill paused={!!conf.recording_paused} onToggle={toggleRecording} /> : <span>Not recording</span>}<button onClick={hangup} style={{ width: 48, height: 48, borderRadius: "50%", background: T.red, border: "none", color: "white" }}><Icon d={I.hangup} size={20} /></button></div></>}
    {!live && !incoming && <><div style={{ padding: "20px 20px 0", textAlign: "center" }}><div style={{ fontSize: 28, fontFamily: T.mono }}>{phone || "+1"}</div></div><Keypad onPress={(d) => setPhone((p) => p + d)} /><div style={{ padding: "8px 32px 22px", display: "flex", justifyContent: "center", gap: 16 }}><button onClick={() => setPhone((p) => p.slice(0, -1))}>Delete</button><button onClick={() => startOutboundPstn(phone, st.ctx)} disabled={!phone.trim() || !st.device} style={{ width: 64, height: 64, borderRadius: "50%", background: T.green, border: "none", color: "white" }}><Icon d={I.phone} size={24} /></button><button onClick={() => setPhone("")}>Clear</button></div></>}
    {live && !incoming && <div style={{ padding: "12px 20px 18px", borderTop: `1px solid ${T.border}`, background: T.surface }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{st.transcript.length === 0 ? "Call transcript will appear here" : st.transcript.slice(-3).map((s) => s.text).join(" ")}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SMART_REPLIES.map((r) => <span key={r} style={{ padding: "5px 10px", borderRadius: 12, fontSize: 11, background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}` }}>{r}</span>)}</div></div>}
    {others.length > 0 && <div style={{ padding: "0 20px" }}>{others.map((p) => <ParticipantRow key={p.id} name={p.display_name ?? p.phone_number ?? p.identity ?? "Participant"} durationSec={p.joined_at ? Math.floor((Date.now() - new Date(p.joined_at).getTime()) / 1000) : undefined} muted={p.muted} onMute={() => conf && dialerApi.muteParticipant(conf.id, p.id, !p.muted)} onSpeaker={() => {}} onKick={() => conf && dialerApi.kickParticipant(conf.id, p.id)} />)}</div>}
  </div>;
}
