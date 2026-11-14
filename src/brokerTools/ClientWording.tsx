// BF_PORTAL_CONDITION_CLIENT_WORDING - a condition the client owns is shown to the client in plain words. Staff see the
// lender's wording as the condition's title and, here, what the client reads instead. Blank means the client sees the
// condition as written.
import { useEffect, useState } from "react";

export const CLIENT_WORDING_LABEL = "What the client sees";
export const CLIENT_WORDING_HINT = "Plain words for the client's app. Leave blank to show the condition as written.";

export function ClientWording({ title, value, disabled, onSave }: { title: string; value: string | null | undefined; disabled?: boolean; onSave: (text: string | null) => void }) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => { setText(value ?? ""); }, [value]);
  const commit = () => { const next = text.trim(); if (next !== (value ?? "")) onSave(next || null); };
  return (
    <label style={{ display: "block", flexBasis: "100%", fontSize: 12, color: "var(--ui-text-muted)" }}>
      {CLIENT_WORDING_LABEL}
      <input
        aria-label={`${CLIENT_WORDING_LABEL}: ${title}`}
        style={{ display: "block", width: "100%", maxWidth: 640, marginTop: 2, padding: "6px 8px", fontSize: 13, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface, #fff)", color: "var(--ui-text)" }}
        value={text} disabled={disabled} maxLength={300} placeholder={title}
        onChange={(e) => setText(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
      />
      <span style={{ display: "block", marginTop: 2 }}>{CLIENT_WORDING_HINT}</span>
    </label>
  );
}
