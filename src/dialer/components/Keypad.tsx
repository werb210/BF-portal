// BF_PORTAL_BLOCK_v601_DIALER_PANEL_v1
import React from "react";
const KEYS: { d: string; sub?: string }[] = [
  { d: "1" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
  { d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
  { d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
  { d: "*" }, { d: "0", sub: "+" }, { d: "#" },
];
export function Keypad({ onPress }: { onPress: (d: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {KEYS.map((k) => (
        <button key={k.d} onClick={() => onPress(k.d)} style={{
          background: "#1f2937", border: "1px solid #374151", borderRadius: 999,
          color: "#fff", padding: "14px 0", fontSize: 22, cursor: "pointer", fontWeight: 600,
        }}>
          {k.d}{k.sub && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{k.sub}</div>}
        </button>
      ))}
    </div>
  );
}
