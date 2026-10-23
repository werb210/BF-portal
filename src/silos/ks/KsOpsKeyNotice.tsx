// BF_PORTAL_v849_KS_SILO - shows a licensee's new ops key once (KS-Ops never shows it again).
import { useState } from "react";
import { Button, card } from "./ksUi";

export function OpsKeyNotice({ opsKey, message }: { opsKey: string; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" data-testid="ks-ops-key" style={{ ...card, borderColor: "#b45309", marginBottom: 12 }}>
      <p style={{ marginTop: 0, fontWeight: 600 }}>{message}</p>
      <code style={{ display: "block", padding: 10, borderRadius: 8, background: "var(--ui-surface)", wordBreak: "break-all", fontSize: 14, marginBottom: 8 }}>
        {opsKey}
      </code>
      <Button
        onClick={() => {
          try {
            void navigator.clipboard?.writeText(opsKey).then(() => setCopied(true));
          } catch {
            // copy by hand
          }
        }}
      >
        {copied ? "Copied" : "Copy key"}
      </Button>
    </div>
  );
}
