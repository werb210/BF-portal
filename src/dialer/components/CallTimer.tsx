// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React, { useEffect, useState } from "react";
export function CallTimer({ startedAt, paused }: { startedAt: string | null; paused?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!startedAt || paused) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [startedAt, paused]);
  if (!startedAt) return <span>00:00</span>;
  const ms = now - new Date(startedAt).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  return <span>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
}
