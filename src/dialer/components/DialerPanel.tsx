// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React, { useMemo, useState } from "react";
import { useDialer } from "../store";
import { dialerApi } from "../api";
import { startOutboundPstn, hangup } from "../actions";
import { Keypad } from "./Keypad";
import { RecordingConsent } from "./RecordingConsent";
import { ParticipantRow } from "./ParticipantRow";
import { TranscriptStream } from "./TranscriptStream";
import { AddParticipantBar } from "./AddParticipantBar";
import { TransferBar } from "./TransferBar";
import { CallTimer } from "./CallTimer";

export default function DialerPanel() { const st = useDialer(); const [phone, setPhone] = useState(""); const [showKeypad, setShowKeypad] = useState(false);
const conf = st.conference; const me = useMemo(() => st.participants.find((p) => p.role === "moderator"), [st.participants]);
const others = useMemo(() => st.participants.filter((p) => p.id !== me?.id), [st.participants, me]);
const connected = st.status === "connected" || st.status === "ringing" || st.status === "dialing";
const headline = me ? (st.ctx.contactName ?? others[0]?.display_name ?? "") : (st.ctx.contactName ?? "");
const dtmf = (d: string) => { if (st.call) { try { (st.call as any).sendDigits?.(d); } catch {} } if (!st.call && !connected) setPhone(phone + d); };
const toggleRecording = async () => { if (!conf) return; if (!conf.recording_sid) return; await dialerApi.recording(conf.id, conf.recording_paused ? "resume" : "pause"); };
if (!st.isOpen && !connected && !st.incoming) return null;
return <div style={panel}><div style={header}><div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4b5563", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>{(headline || "?").slice(0, 2).toUpperCase()}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline || (connected ? "Connecting…" : "New call")}</div><div style={{ color: "#9ca3af", fontSize: 11 }}>{conf ? <CallTimer startedAt={conf.started_at} /> : (st.status === "preflight" ? "Checking…" : "Ready")}{conf?.silo && <span> · {conf.silo}</span>}</div></div>{st.ctx.contactId && <a href={`/crm/contacts/${st.ctx.contactId}`} style={openContact}>Open Contact</a>}<button onClick={() => st.close()} style={closeBtn} title="Close">✕</button></div>{st.error && <div style={errBar}>{st.error}</div>}{!connected && <div style={{ padding: "8px 12px", display: "flex", gap: 6 }}><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 12px", color: "#fff" }} /><button onClick={() => startOutboundPstn(phone, st.ctx)} disabled={!phone.trim() || !st.device} style={{ background: "#22c55e", border: "none", borderRadius: 8, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Call</button></div>}{connected && <div style={{ padding: "8px 12px", display: "flex", gap: 6, justifyContent: "space-around" }}><CtlBtn label="Mute" on={!!me?.muted} onClick={() => me && conf && dialerApi.muteParticipant(conf.id, me.id, !me.muted)} /><CtlBtn label="Hold" on={!!me?.on_hold} onClick={() => me && conf && dialerApi.holdParticipant(conf.id, me.id, !me.on_hold)} /><CtlBtn label="Keypad" on={showKeypad} onClick={() => setShowKeypad((v) => !v)} /><CtlBtn label="End" danger onClick={() => hangup()} /></div>}{showKeypad && connected && <div style={{ padding: 12 }}><Keypad onPress={dtmf} /></div>}{connected && conf && <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}><RecordingConsent recording={!!conf.recording_sid} paused={!!conf.recording_paused} onToggle={toggleRecording} /><div style={{ display: "flex", gap: 6 }}><TransferBar conferenceId={conf.id} initiatorPid={me?.id ?? null} /></div><AddParticipantBar conferenceId={conf.id} /></div>}{connected && others.length > 0 && <div style={{ padding: "8px 12px" }}>{others.map((p) => <ParticipantRow key={p.id} p={p} canModerate={me?.role === "moderator"} onMute={() => conf && dialerApi.muteParticipant(conf.id, p.id, !p.muted)} onHold={() => conf && dialerApi.holdParticipant(conf.id, p.id, !p.on_hold)} onKick={() => conf && dialerApi.kickParticipant(conf.id, p.id)} />)}</div>}{connected && <div style={{ borderTop: "1px solid #1f2937" }}><TranscriptStream segments={st.transcript} /></div>}</div>;
}
const panel: React.CSSProperties = { position: "fixed", right: 16, bottom: 16, width: 360, maxHeight: "calc(100vh - 32px)", background: "#0b1220", color: "#fff", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,.45)", border: "1px solid #1f2937", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1000 };
const header: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: "1px solid #1f2937" };
const errBar: React.CSSProperties = { background: "#7f1d1d", color: "#fee2e2", padding: "6px 12px", fontSize: 12 };
const closeBtn: React.CSSProperties = { background: "transparent", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer" };
const openContact: React.CSSProperties = { background: "#1f2937", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11, textDecoration: "none" };
function CtlBtn({ label, on, danger, onClick }: { label: string; on?: boolean; danger?: boolean; onClick: () => void }) { return <button onClick={onClick} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: danger ? "#dc2626" : on ? "#facc15" : "#1f2937", color: danger ? "#fff" : on ? "#111827" : "#e5e7eb" }}>{label}</button>; }
