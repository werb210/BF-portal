import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useDialerStore } from "@/state/dialer.store";
import { useSilo } from "@/hooks/useSilo";
import { fetchTwilioToken } from "@/services/twilioVoice";
import { api } from "@/api";

async function bfPlaceOutboundCall(toNumber: string) {
  console.log("[dialer.diag] call.button.click", { to: toNumber, ts: new Date().toISOString() });
  const base = import.meta.env.VITE_API_URL || "https://server.boreal.financial";
  const token = typeof window !== "undefined"
    ? (localStorage.getItem("auth_token") || localStorage.getItem("bf_jwt_token") || "")
    : "";
  const url = `${base}/api/telephony/outbound-call`;
  console.log("[dialer.diag] outbound-call.fetch.start", { url, to: toNumber });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({ To: toNumber }),
  });
  const body = await response.json().catch(() => ({}));
  console.log("[dialer.diag] outbound-call.fetch.result", { status: response.status, body });
  if (!response.ok) {
    throw new Error(typeof body === "string" ? body : JSON.stringify(body));
  }
  return body;
}

// BF_DIALER_DIAG_v24
function bfLogDialerPhase(phase: string, extra?: Record<string, unknown>) {
  console.log("[dialer.diag]", phase, { ts: new Date().toISOString(), ...(extra ?? {}) });
}

const DTMF_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const SMART_REPLIES = [
  "Let me look into that for you",
  "I'll get in touch with the team",
  "I'll review and get back to you",
  "Can I put you on a brief hold?",
  "Let me check that for you right now",
];

function CtrlBtn({ label, icon, active, onClick, danger }: { label: string; icon: string; active?: boolean; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer",
        background: danger ? "#ef4444" : active ? "#3b82f6" : "#374151",
        color: "#fff", fontSize: 11, minWidth: 56,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </button>
  );
}

export default function DialerPanel() {
  const {
    isOpen, isMinimized, context, status, muted, onHold,
    number, error, elapsedSeconds,
    setStatus, setNumber, setMuted, setOnHold,
    startCall, endCall, minimizeDialer, openDialer,
    currentCallId, setError,
  } = useDialerStore();
  const { silo } = useSilo();

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [transcript, setTranscript] = useState("");
  const [participants, setParticipants] = useState<{ number: string; duration: number }[]>([]);
  const [addInput, setAddInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);

  const isActive = status === "connected";
  const inProgress = ["dialing", "ringing", "connected"].includes(status);

  useEffect(() => {
    if (context.phone && !number) setNumber(context.phone);
  }, [context.phone, number, setNumber]);

  useEffect(() => {
    const onDialerCall = (event: Event) => {
      const custom = event as CustomEvent<{ phone?: string; contactId?: string; contactName?: string }>;
      const phone = custom.detail?.phone?.trim();
      if (!phone) return;
      openDialer({ source: "crm", phone, contactId: custom.detail?.contactId, contactName: custom.detail?.contactName });
      setNumber(phone);
      queueMicrotask(() => { void handleDial(phone); });
    };
    window.addEventListener("bf:dialer-call", onDialerCall as EventListener);
    return () => {
      window.removeEventListener("bf:dialer-call", onDialerCall as EventListener);
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [openDialer, setNumber, inProgress]);

  async function initDevice() {
    if (deviceRef.current) return deviceRef.current;
    bfLogDialerPhase("device.init.start");
    const token = await fetchTwilioToken();
    const device = new Device(token, { logLevel: "warn" });
    await device.register();
    bfLogDialerPhase("device.registered");
    deviceRef.current = device;
    device.on("incoming", (call: Call) => { bfLogDialerPhase("device.on.incoming"); callRef.current = call; setStatus("ringing"); });
    device.on("error", (error: Error) => bfLogDialerPhase("device.on.error", { message: error.message }));
    device.on("cancel", () => bfLogDialerPhase("device.on.cancel"));
    device.on("unregistered", () => bfLogDialerPhase("device.on.unregistered"));
    return device;
  }

  async function handleDial(overrideNumber?: string) {
    const target = (overrideNumber ?? number).trim();
    bfLogDialerPhase("call.button.click", { target });
    if (!target || inProgress) return;
    setError(null);
    try {
      const device = await initDevice();
      bfLogDialerPhase("outbound-call.start", { target, applicationId: context.applicationId ?? null });
      const call = await device.connect({ params: { To: target, applicationId: context.applicationId ?? "" } });
      callRef.current = call;
      startCall();
      call.on("ringing", () => { bfLogDialerPhase("call.on.ringing"); setStatus("ringing"); });
      call.on("accept", () => { bfLogDialerPhase("call.on.accept"); setStatus("connected"); });
      call.on("disconnect", () => { bfLogDialerPhase("call.on.disconnect"); handleEndCall("completed"); });
      call.on("cancel", () => { bfLogDialerPhase("call.on.cancel"); handleEndCall("canceled"); });
      call.on("error", (e: Error) => { bfLogDialerPhase("call.on.error", { message: e.message }); setError(e.message); handleEndCall("failed"); });
    } catch (e: any) {
      bfLogDialerPhase("outbound-call.error", { message: e?.message ?? "unknown" });
      setError(e.message ?? "Call failed");
      setStatus("failed");
    }
  }

  function handleEndCall(outcome = "completed") {
    callRef.current?.disconnect();
    callRef.current = null;
    endCall(outcome as any, outcome === "completed" ? "completed" : "failed");
    setIsRecording(false);
    setTranscript("");
    setParticipants([]);
    if (transcript && context.contactId) {
      api.post("/api/calls/transcript", { callSid: currentCallId, transcript, crmContactId: context.contactId, applicationId: context.applicationId }).catch(() => {});
    }
  }

  function handleMute() {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  }

  async function handleRecord() {
    if (!currentCallId) return;
    try {
      if (!isRecording) {
        await api.post("/api/telephony/record/start", { callSid: currentCallId });
        setIsRecording(true);
      } else {
        await api.post("/api/telephony/record/stop", { callSid: currentCallId });
        setIsRecording(false);
      }
    } catch {}
  }

  function handleDtmf(digit: string) {
    callRef.current?.sendDigits(digit);
  }

  async function handleAddParticipant() {
    if (!addInput.trim() || !currentCallId) return;
    await api.post("/api/telephony/conference/add", { callSid: currentCallId, to: addInput.trim() }).catch(() => {});
    setParticipants((prev) => [...prev, { number: addInput.trim(), duration: 0 }]);
    setAddInput("");
  }

  async function handleTransfer() {
    if (!addInput.trim() || !currentCallId) return;
    await api.post("/api/telephony/transfer", { callSid: currentCallId, to: addInput.trim() }).catch(() => {});
  }

  async function handleMerge() {
    if (!currentCallId) return;
    await api.post("/api/telephony/conference/merge", { callSid: currentCallId }).catch(() => {});
  }

  async function handleStartConference() {
    if (!currentCallId) return;
    await api.post("/api/telephony/conference/start", { callSid: currentCallId }).catch(() => {});
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!isOpen && !(isMinimized && inProgress)) return null;

  if (isMinimized && inProgress) {
    return (
      <div style={{ position: "fixed", right: 24, bottom: 96, zIndex: 2147483001, display: "flex", gap: 8, alignItems: "center", background: "#111827", color: "#fff", borderRadius: 999, padding: "8px 10px", boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}>
        <button type="button" onClick={() => openDialer()} aria-label="Restore dialer" style={{ minWidth: 48, minHeight: 48, border: 0, borderRadius: 999, background: "transparent", color: "#fff", cursor: "pointer", padding: "0 10px", fontWeight: 600 }}>
          In call {fmt(elapsedSeconds)}
        </button>
        <button type="button" onClick={() => handleEndCall()} aria-label="End call" style={{ width: 48, height: 48, border: 0, borderRadius: 999, background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 20 }}>✕</button>
      </div>
    );
  }

  const siloColors: Record<string, string> = { BF: "#3b82f6", BI: "#8b5cf6", SLF: "#f59e0b" };
  const siloColor = siloColors[silo ?? ""] ?? "#374151";

  return (
    <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: 360, background: "#111827", color: "#fff", zIndex: 2000, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.4)", overflowY: "auto" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{context.contactName?.charAt(0).toUpperCase() || "?"}</div>
          <div>
            {context.contactName && <div style={{ fontWeight: 700, fontSize: 15 }}>{context.contactName}</div>}
            {context.applicationName && <div style={{ fontSize: 12, color: "#9ca3af" }}>{context.applicationName}</div>}
            {!context.contactName && !context.applicationName && (<div style={{ fontSize: 13, color: "#9ca3af" }}>{status === "idle" ? "Ready" : status === "dialing" ? "Connecting…" : status === "ringing" ? "Ringing…" : "Connected"}</div>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {silo && <span style={{ background: siloColor, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{silo}</span>}
          {context.contactId && <button style={{ fontSize: 11, padding: "4px 8px", background: "#374151", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }} onClick={() => window.open(`/crm/contacts/${context.contactId}`, "_blank")}>Open Contact</button>}
          <button type="button" onClick={minimizeDialer} aria-label="Close dialer" style={{ width: 48, height: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "white", border: 0, borderRadius: 12, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
        {inProgress && <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>{fmt(elapsedSeconds)}</div>}
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{status === "idle" ? "Ready" : status === "dialing" ? "Connecting…" : status === "ringing" ? "Ringing…" : status === "connected" ? "Connected" : status}</div>
        {number && !inProgress && <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: "#e5e7eb" }}>{number}</div>}
        {inProgress && <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{number}</div>}
      </div>

      {isActive && (
        <div style={{ padding: "8px 16px 4px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <CtrlBtn label="Mute" icon="🎙" active={muted} onClick={handleMute} />
          <CtrlBtn label="Hold" icon="⏸" active={onHold} onClick={() => setOnHold(!onHold)} />
          <CtrlBtn label="Record" icon="⏺" active={isRecording} onClick={handleRecord} />
          <CtrlBtn label="Keypad" icon="🔢" active={showKeypad} onClick={() => setShowKeypad((v) => !v)} />
          <CtrlBtn label="Transfer" icon="↗" active={false} onClick={handleTransfer} />
          <CtrlBtn label="Add" icon="👤+" active={false} onClick={handleAddParticipant} />
          <CtrlBtn label="Merge" icon="⑂" active={false} onClick={handleMerge} />
          <button onClick={() => handleEndCall()} style={{ minWidth: 56, minHeight: 56, border: "none", borderRadius: 10, background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 600 }}>End</button>
        </div>
      )}

      {isActive && (
        <div style={{ padding: "4px 16px 8px", display: "flex", gap: 6 }}>
          <input value={addInput} onChange={(e) => setAddInput(e.target.value)} placeholder="Search participants…" style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 13 }} />
        </div>
      )}

      {participants.length > 0 && (
        <div style={{ margin: "0 16px 8px", background: "#1f2937", borderRadius: 8, overflow: "hidden" }}>
          {participants.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: i > 0 ? "1px solid #374151" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{p.number[0] ?? "?"}</div>
              <div style={{ flex: 1, fontSize: 13 }}>{p.number}</div>
              <span style={{ color: "#6b7280", fontSize: 12 }}>🎙 🔊</span>
            </div>
          ))}
          <button style={{ width: "100%", padding: "10px 0", background: "#f59e0b", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={handleStartConference}>Start Conference</button>
        </div>
      )}

      {(showKeypad || (!inProgress)) && (
        <div style={{ padding: "8px 16px" }}>
          {DTMF_KEYS.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              {row.map((digit) => (
                <button key={digit} onClick={() => inProgress ? handleDtmf(digit) : setNumber(`${number}${digit}`)} style={{ padding: "14px 0", background: "#1f2937", border: "1px solid #374151", borderRadius: 10, color: "#fff", fontSize: 18, fontWeight: 600, cursor: "pointer" }}>{digit}</button>
              ))}
            </div>
          ))}
          {!inProgress && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input value={number} onChange={(e) => setNumber(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleDial()} placeholder="Enter phone number" style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 15 }} />
              {number && <button onClick={() => setNumber(number.slice(0, -1))} style={{ background: "#374151", border: "none", borderRadius: 8, padding: "0 14px", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>⌫</button>}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ margin: "0 16px 8px", padding: "8px 12px", background: "#450a0a", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>{error}</div>}

      {isActive && <div style={{ flex: 1, margin: "0 16px 8px", background: "#1f2937", borderRadius: 8, padding: 12, minHeight: 60, overflow: "auto", fontSize: 12, color: "#d1d5db" }}>{transcript || <span style={{ color: "#4b5563" }}>Call transcript will appear here</span>}</div>}

      {isActive && (
        <div style={{ padding: "0 16px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SMART_REPLIES.map((reply) => <button key={reply} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 20, padding: "4px 10px", color: "#d1d5db", cursor: "pointer", fontSize: 12 }}>{reply}</button>)}
          <p style={{ width: "100%", fontSize: 10, color: "#4b5563", margin: "4px 0 0" }}>* Transcript and smart replies will only display on answered calls</p>
        </div>
      )}

      {!inProgress && (
        <div style={{ padding: "8px 16px 24px" }}>
          <button
            onClick={async () => {
              if (!number.trim()) return;
              try {
                await bfPlaceOutboundCall(number.trim());
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                alert(`Call failed: ${message}`);
              }
              await handleDial();
            }}
            disabled={!number.trim()}
            style={{ width: "100%", padding: 14, background: number.trim() ? "#22c55e" : "#374151", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, cursor: number.trim() ? "pointer" : "default", fontWeight: 700 }}
          >
            📞 Call
          </button>
        </div>
      )}
    </div>
  );
}
