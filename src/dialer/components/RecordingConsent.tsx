// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React from "react";
export function RecordingConsent({ recording, paused, onToggle }: { recording: boolean; paused: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: "100%", padding: "10px 14px", borderRadius: 10,
      background: recording && !paused ? "#facc15" : "#374151",
      color: recording && !paused ? "#111827" : "var(--ui-border)",
      border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
    }}>
      {recording ? (paused ? "Recording paused — tap to resume" : "Recording consent — tap to pause") : "Start recording"}
    </button>
  );
}
