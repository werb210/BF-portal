// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React, { useEffect, useRef } from "react";
import type { TranscriptSegment } from "../types";

export function TranscriptStream({ segments }: { segments: TranscriptSegment[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [segments.length]);
  if (segments.length === 0) return (
    <div style={{ color: "#6b7280", fontSize: 12, padding: 12, textAlign: "center" }}>Call transcript will appear here</div>
  );
  return (
    <div ref={ref} style={{ maxHeight: 160, overflowY: "auto", padding: "6px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ fontSize: 12, color: s.final ? "var(--ui-border)" : "#9ca3af", lineHeight: 1.4 }}>
          {s.text}
        </div>
      ))}
    </div>
  );
}
