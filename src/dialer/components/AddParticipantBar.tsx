// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React, { useState } from "react";
import { dialerApi } from "../api";

export function AddParticipantBar({ conferenceId }: { conferenceId: string | null }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  if (!conferenceId) return null;
  const submit = async () => {
    const value = v.trim(); if (!value) return;
    setBusy(true);
    try {
      const looksPhone = /[\d\+\-\(\)\s]/.test(value) && /\d/.test(value);
      await dialerApi.addParticipant(conferenceId, looksPhone ? { phone: value } : { identity: value });
      setV("");
    } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "flex", gap: 6, padding: "0 12px" }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Add by phone or staff identity"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13 }} />
      <button onClick={submit} disabled={busy || !v.trim()} style={{
        background: "#2563eb", border: "none", borderRadius: 8, color: "#fff",
        padding: "8px 12px", cursor: busy ? "default" : "pointer", fontWeight: 700, fontSize: 13,
      }}>Add</button>
    </div>
  );
}
