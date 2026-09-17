// BF_PORTAL_BLOCK_v623_MEGAFIX_v1 — adds console.debug on FAB click so
// dialer-not-appearing reports can be triaged from the console.
// BF_PORTAL_BLOCK_v606_DIALER_UI_v1
import React, { useEffect, useRef, useState } from "react";

// BF_PORTAL_DIALER_BUTTON_DOCK_v318 - the 64px button sat in the bottom-right
// corner, exactly where Accept / Save / Send buttons live (the document review
// pane, dialogs). It now docks to the right edge, part-way up the screen, and
// staff can drag it up or down; the position is remembered.
const DOCK_KEY = "bf_dialer_button_top_pct";
export function clampDockPercent(value: number): number {
  if (!Number.isFinite(value)) return 62;
  return Math.min(88, Math.max(12, value));
}
import { useDialer } from "../store";

export default function FloatingDialerButton() {
  // BF_PORTAL_BLOCK_v308_DIALER_TOGGLE_v1
  const isOpen = useDialer((s) => s.isOpen);
  const status = useDialer((s) => s.status);
  const incoming = useDialer((s) => s.incoming);
  const open = useDialer((s) => s.open);
  const close = useDialer((s) => s.close);

  const [topPct, setTopPct] = useState<number>(() => {
    try { return clampDockPercent(Number(window.localStorage.getItem(DOCK_KEY) ?? 62)); } catch { return 62; }
  });
  const drag = useRef<{ startY: number; startPct: number; moved: boolean } | null>(null);
  useEffect(() => {
    try { window.localStorage.setItem(DOCK_KEY, String(topPct)); } catch { /* storage unavailable */ }
  }, [topPct]);
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = { startY: e.clientY, startPct: topPct, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    if (drag.current.moved) setTopPct(clampDockPercent(drag.current.startPct + (dy / Math.max(1, window.innerHeight)) * 100));
  };
  const onPointerUp = () => { setTimeout(() => { drag.current = null; }, 0); };

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
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          if (drag.current?.moved) return; // a drag is not a click
          if (isOpen) { console.debug("[Dialer] FAB clicked → close()"); close(); }
          else { console.debug("[Dialer] FAB clicked → open()"); open(); }
        }}
        title={isOpen ? "Close dialer" : "Open dialer"}
        aria-label={isOpen ? "Close dialer" : "Open dialer"}
        style={{ position: "fixed", right: 12, top: `${topPct}%`, transform: "translateY(-50%)", width: 52, height: 52, borderRadius: "50%", cursor: "grab", touchAction: "manipulation", background: live ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, var(--ui-accent-blue), var(--ui-accent-blue))", color: "white", border: "none", boxShadow: live ? "0 10px 26px rgba(16,185,129,0.5), 0 0 0 2px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.18)" : "0 10px 26px rgba(37,99,235,0.5), 0 0 0 2px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.18)", display: "grid", placeItems: "center", zIndex: 1001 }}>
        {ringing && !isOpen && (<span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #10b981", animation: "bf-fab-ring 1.2s ease-out infinite" }} />)}
        {isOpen ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
          </svg>
        )}
      </button>
    </>
  );
}
