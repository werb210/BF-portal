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
    <div style={{ border: "1px dashed var(--ui-border)", borderRadius: 10, background: "var(--ui-surface-muted)", padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>{tab}</h2>
      <p style={{ color: "var(--ui-text-muted)" }}>{description}</p>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--ui-text-muted)", marginBottom: 8 }}>
          Expected payload shape
        </div>
        <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: "var(--ui-surface-muted)", color: "var(--ui-text)", overflowX: "auto" }}>
          {expectedShape}
        </pre>
      </div>
    </div>
  );
}
