// BF_PORTAL_v817_IPAD_VOIP - the iPad app's native (CallKit) call, shown in the portal:
// "On a call with X" with mute / speaker / hang up driving the native call.
import React from "react";
import { useDialer } from "../store";
import { nativeHangup, nativeToggleMute, nativeToggleSpeaker } from "../nativeVoice";
import { nativeCallerLabel } from "@/native/portalVoip";

export default function NativeCallBanner() {
  const call = useDialer((s) => s.nativeCall);
  if (!call) return null;
  const who = nativeCallerLabel(call);
  const ringing = call.phase === "ringing";
  return (
    <div role="status" aria-live="polite" style={wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>{ringing ? "Incoming call" : "On a call with"}</div>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</div>
      </div>
      {!ringing && (
        <>
          <button type="button" onClick={() => void nativeToggleMute()} style={btn(call.muted ? "#f59e0b" : "#374151")}>{call.muted ? "Unmute" : "Mute"}</button>
          <button type="button" onClick={() => void nativeToggleSpeaker()} style={btn(call.speaker ? "#2563eb" : "#374151")}>Speaker</button>
        </>
      )}
      <button type="button" onClick={() => void nativeHangup()} style={btn("#dc2626")}>{ringing ? "Decline" : "Hang up"}</button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", width: "min(520px, calc(100vw - 32px))",
  padding: 12, borderRadius: 12, background: "#0b1220", color: "#fff", border: "1px solid #1f2937",
  boxShadow: "0 12px 28px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 8, zIndex: 1002,
};
const btn = (bg: string): React.CSSProperties => ({
  background: bg, border: "none", color: "#fff", padding: "8px 12px",
  borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13,
});
