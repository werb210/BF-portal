import type { ReactNode } from "react";

export default function AwaitingBackendPanel({
  tab,
  description,
  expectedShape,
}: {
  tab: string;
  description: string;
  expectedShape: ReactNode;
}) {
  return (
    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, background: "#f8fafc", padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>{tab}</h2>
      <p style={{ color: "#475569" }}>{description}</p>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>
          Expected payload shape
        </div>
        <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: "#0f172a", color: "#e2e8f0", overflowX: "auto" }}>
          {expectedShape}
        </pre>
      </div>
    </div>
  );
}
