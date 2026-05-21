// BF_PORTAL_BLOCK_v606_DIALER_UI_v1
import React from "react";
import { useDialer } from "../store";

export default function FloatingDialerButton() {
  const isOpen = useDialer((s) => s.isOpen);
  const status = useDialer((s) => s.status);
  const incoming = useDialer((s) => s.incoming);
  const open = useDialer((s) => s.open);
  if (isOpen) return null;

  const live = status === "connected" || status === "ringing" || status === "dialing";
  const ringing = !!incoming || status === "ringing";

  return (
    <>
      <style>{`
        @keyframes bf-fab-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
      <button onClick={() => open()} title="Open dialer" aria-label="Open dialer"
        style={{ position: "fixed", right: 24, bottom: 24, width: 64, height: 64, borderRadius: "50%", background: live ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", border: live ? "none" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", boxShadow: live ? "0 8px 24px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" : "0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)", display: "grid", placeItems: "center", zIndex: 999 }}>
        {ringing && (<span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #10b981", animation: "bf-fab-ring 1.2s ease-out infinite" }} />)}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>
    </>
  );
}
