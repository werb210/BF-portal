// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React from "react";
import { useDialer } from "../store";

export default function FloatingDialerButton() {
  const isOpen = useDialer((s) => s.isOpen);
  const status = useDialer((s) => s.status);
  const open = useDialer((s) => s.open);
  if (isOpen) return null;
  const live = status === "connected" || status === "ringing" || status === "dialing" || status === "incoming";
  return (
    <button onClick={() => open()} title="Open dialer" style={{
      position: "fixed", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 999,
      background: live ? "#22c55e" : "#2563eb", color: "#fff", border: "none",
      cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.35)", fontSize: 22, zIndex: 999,
    }}>📞</button>
  );
}
