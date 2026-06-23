// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React, { useState } from "react";
import { dialerApi } from "../api";

export function TransferBar({ conferenceId, initiatorPid }: { conferenceId: string | null; initiatorPid: string | null }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const [mode, setMode] = useState<"warm" | "cold">("warm");
  if (!conferenceId) return null;
  const submit = async () => {
    const value = v.trim(); if (!value) return;
    const looksPhone = /[\d\+\-\(\)\s]/.test(value) && /\d/.test(value);
    await dialerApi.transfer(conferenceId, {
      mode,
      target: looksPhone ? { phone: value } : { identity: value },
      initiatorParticipantId: mode === "cold" ? (initiatorPid ?? undefined) : undefined,
    });
    setV(""); setOpen(false);
  };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={btnSmall}>Transfer</button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 12px" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setMode("warm")} style={chip(mode === "warm")}>Warm</button>
        <button onClick={() => setMode("cold")} style={chip(mode === "cold")}>Cold</button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Phone or identity"
          autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13 }} />
        <button onClick={submit} style={{ ...btnSmall, background: "var(--ui-accent-blue)" }}>Go</button>
        <button onClick={() => setOpen(false)} style={btnSmall}>Cancel</button>
      </div>
    </div>
  );
}
const btnSmall: React.CSSProperties = {
  background: "#374151", border: "none", borderRadius: 8, color: "#fff",
  padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const chip = (on: boolean): React.CSSProperties => ({
  background: on ? "#facc15" : "#1f2937", color: on ? "#111827" : "#fff",
  border: "none", borderRadius: 999, padding: "4px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer",
});
