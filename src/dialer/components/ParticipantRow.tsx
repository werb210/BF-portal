// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React from "react";
import type { Participant } from "../types";

export function ParticipantRow({ p, canModerate, onMute, onHold, onKick }: {
  p: Participant; canModerate: boolean;
  onMute: () => void; onHold: () => void; onKick: () => void;
}) {
  const sub = p.kind === "pstn" ? p.phone_number : p.identity;
  const status = p.status === "joined" ? "00:00" : p.status;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid #1f2937" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#374151", color: "#fff",
        display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>
        {(p.display_name ?? sub ?? "?").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.display_name ?? sub}</div>
        <div style={{ color: "#9ca3af", fontSize: 11 }}>{status}{p.muted ? " · muted" : ""}{p.on_hold ? " · on hold" : ""}</div>
      </div>
      {canModerate && (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onMute}  style={btn(p.muted)} title={p.muted ? "Unmute" : "Mute"}>{p.muted ? "🔇" : "🎤"}</button>
          <button onClick={onHold}  style={btn(p.on_hold)} title={p.on_hold ? "Resume" : "Hold"}>⏸</button>
          <button onClick={onKick}  style={btn(false)} title="Kick">✕</button>
        </div>
      )}
    </div>
  );
}
const btn = (active: boolean): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer",
  background: active ? "#dc2626" : "#1f2937", color: "#fff", fontSize: 13,
});
