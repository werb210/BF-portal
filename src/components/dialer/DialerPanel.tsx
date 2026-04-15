import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useDialerStore } from "@/state/dialer.store";
import { fetchTwilioToken } from "@/services/twilioVoice";
import { api } from "@/api";

export default function DialerPanel() {
  const {
    isOpen, isMinimized, context, status, muted, onHold,
    number, dialedNumber, error, elapsedSeconds,
    setStatus, setNumber, setMuted, setOnHold,
    startCall, endCall, openDialer, closeDialer,
    currentCallId, setError, logs
  } = useDialerStore();

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [addParticipantInput, setAddParticipantInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [consentLogged, setConsentLogged] = useState(false);

  const SMART_REPLIES = [
    "Let me look into that for you",
    "I'll get in touch with the team",
    "I'll review and get back to you",
    "Can I put you on a brief hold?",
    "Let me check that for you right now",
  ];

  const isActive = status === "connected";
  const inProgress = ["dialing", "ringing", "connected"].includes(status);

  useEffect(() => {
    if (context.phone && !number) {
      setNumber(context.phone);
    }
  }, [context.phone, number, setNumber]);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, []);

  // keep references in use to avoid dead state and to support debugging/tracing
  void isMinimized;
  void dialedNumber;
  void openDialer;
  void logs;

  async function initDevice() {
    if (deviceRef.current) return deviceRef.current;
    const token = await fetchTwilioToken();
    const device = new Device(token, { logLevel: "warn" });
    await device.register();
    deviceRef.current = device;

    device.on("incoming", (call: Call) => {
      callRef.current = call;
      setStatus("ringing");
    });

    return device;
  }

  async function handleDial() {
    if (!number.trim() || inProgress) return;
    setError(null);
    try {
      const device = await initDevice();
      const call = await device.connect({ params: { To: number.trim(), applicationId: context.applicationId ?? "" } });
      callRef.current = call;
      startCall();
      call.on("ringing", () => setStatus("ringing"));
      call.on("accept", () => setStatus("connected"));
      call.on("disconnect", () => handleEndCall("completed"));
      call.on("cancel", () => handleEndCall("canceled"));
      call.on("error", (e: Error) => { setError(e.message); handleEndCall("failed"); });
    } catch (e: any) {
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
      api.post("/api/calls/transcript", {
        callSid: currentCallId,
        transcript,
        crmContactId: context.contactId,
        applicationId: context.applicationId,
      }).catch(() => {});
    }
  }

  function handleMute() {
    if (!callRef.current) return;
    const newMuted = !muted;
    callRef.current.mute(newMuted);
    setMuted(newMuted);
  }

  function handleHold() {
    setOnHold(!onHold);
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
    } catch {
      // no-op for transient recording API failures
    }
  }

  async function handleRecordingConsent() {
    if (consentLogged || !context.contactId) return;
    await api.post("/api/crm/events", {
      contactId: context.contactId,
      applicationId: context.applicationId,
      eventType: "recording_consent_given",
      payload: { callSid: currentCallId },
    }).catch(() => {});
    setConsentLogged(true);
  }

  async function handleAddParticipant() {
    if (!addParticipantInput.trim() || !currentCallId) return;
    await api.post("/api/telephony/conference/add", {
      callSid: currentCallId,
      to: addParticipantInput.trim(),
    }).catch(() => {});
    setParticipants(prev => [...prev, addParticipantInput.trim()]);
    setAddParticipantInput("");
  }

  async function handleTransfer() {
    if (!addParticipantInput.trim() || !currentCallId) return;
    await api.post("/api/telephony/transfer", {
      callSid: currentCallId,
      to: addParticipantInput.trim(),
    }).catch(() => {});
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, height: "100vh", width: 360,
      background: "#111827", color: "#fff", zIndex: 2000,
      display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 220ms ease"
    }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {context.contactName && <div style={{ fontWeight: 600 }}>{context.contactName}</div>}
          {context.applicationName && <div style={{ fontSize: 12, color: "#9ca3af" }}>{context.applicationName}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {context.contactId && (
            <button style={{ fontSize: 11, padding: "4px 8px", background: "#374151", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}
              onClick={() => window.open(`/crm/contacts/${context.contactId}`, "_blank")}>
              Open Contact
            </button>
          )}
          <button onClick={closeDialer} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
      </div>

      <div style={{ padding: "12px 16px", textAlign: "center" }}>
        {inProgress && (
          <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          {status === "idle" ? "Ready" : status === "dialing" ? "Dialing…" : status === "ringing" ? "Ringing…" : status === "connected" ? "Connected" : status}
        </div>
      </div>

      {isActive && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "0 16px 12px" }}>
          {[
            { label: "Mute", active: muted, onClick: handleMute },
            { label: "Hold", active: onHold, onClick: handleHold },
            { label: "Record", active: isRecording, onClick: handleRecord },
            { label: "Consent", active: consentLogged, onClick: handleRecordingConsent },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} style={{
              background: btn.active ? "#3b82f6" : "#374151",
              border: "none", borderRadius: 8, padding: "10px 0",
              color: "#fff", cursor: "pointer", fontSize: 11, textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>
                {btn.label === "Mute" ? "🎙" : btn.label === "Hold" ? "⏸" : btn.label === "Record" ? "⏺" : "✅"}
              </div>
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {isActive && (
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
          <input
            value={addParticipantInput}
            onChange={e => setAddParticipantInput(e.target.value)}
            placeholder="Search participants…"
            style={{ flex: 1, background: "#374151", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }}
          />
          <button onClick={handleAddParticipant} style={{ background: "#374151", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 12 }}>Add</button>
          <button onClick={handleTransfer} style={{ background: "#374151", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 12 }}>→</button>
        </div>
      )}

      {participants.length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          {participants.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #374151", fontSize: 13 }}>
              <span>{p}</span>
              <span style={{ color: "#9ca3af" }}>🎙 🔊</span>
            </div>
          ))}
          <button style={{ marginTop: 8, width: "100%", padding: 10, background: "#f59e0b", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            Start Conference
          </button>
        </div>
      )}

      {!inProgress && (
        <div style={{ padding: "0 16px 16px" }}>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void handleDial()}
            placeholder="Enter phone number"
            style={{ width: "100%", background: "#374151", border: "none", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 15, boxSizing: "border-box" }}
          />
        </div>
      )}

      {error && <div style={{ padding: "0 16px", color: "#ef4444", fontSize: 13 }}>{error}</div>}

      {isActive && (
        <div style={{ flex: 1, margin: "0 16px 12px", background: "#1f2937", borderRadius: 8, padding: 12, overflow: "auto", fontSize: 12, color: "#d1d5db" }}>
          {transcript || <span style={{ color: "#6b7280" }}>Call transcript will appear here</span>}
        </div>
      )}

      {isActive && (
        <div style={{ padding: "0 16px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SMART_REPLIES.map(reply => (
            <button key={reply} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 20, padding: "4px 10px", color: "#d1d5db", cursor: "pointer", fontSize: 12 }}>
              {reply}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "0 16px 24px" }}>
        {!inProgress ? (
          <button
            onClick={() => void handleDial()}
            disabled={!number.trim()}
            style={{ width: "100%", padding: 14, background: "#22c55e", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 600 }}
          >
            📞 Call
          </button>
        ) : (
          <button
            onClick={() => handleEndCall()}
            style={{ width: "100%", padding: 14, background: "#ef4444", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 600 }}
          >
            📵 End Call
          </button>
        )}
      </div>
    </div>
  );
}
