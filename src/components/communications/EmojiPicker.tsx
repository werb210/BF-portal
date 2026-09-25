// BF_PORTAL_BLOCK_v502_EMOJI_PICKER - one small emoji picker shared by the SMS,
// Messages, Team and email composers. Buttons use onMouseDown + preventDefault
// so the composer keeps its cursor (the email editor inserts at the caret).
// The iOS dialler needs no equivalent: the iOS keyboard has emoji built in.
import { useEffect, useRef, useState, type CSSProperties } from "react";

export const EMOJIS: string[] = [
  "\u{1f600}", "\u{1f604}", "\u{1f60a}", "\u{1f642}", "\u{1f609}", "\u{1f60d}", "\u{1f914}", "\u{1f605}",
  "\u{1f602}", "\u{1f64f}", "\u{1f44d}", "\u{1f44e}", "\u{1f44f}", "\u{1f64c}", "\u{1f44b}", "\u{1f4aa}",
  "\u{1f91d}", "\u{2705}", "\u{274c}", "\u{26a0}\u{fe0f}", "\u{2757}", "\u{2753}", "\u{2b50}", "\u{1f389}",
  "\u{1f525}", "\u{1f4af}", "\u{2764}\u{fe0f}", "\u{1f499}", "\u{1f4de}", "\u{1f4f1}", "\u{1f4e7}", "\u{1f4c4}",
  "\u{1f4ce}", "\u{1f4c5}", "\u{23f0}", "\u{1f4b0}", "\u{1f4b5}", "\u{1f3e6}", "\u{1f3e0}", "\u{1f3e2}",
  "\u{1f69a}", "\u{1f527}", "\u{270d}\u{fe0f}", "\u{1f511}", "\u{1f4c8}", "\u{1f4c9}", "\u{1f440}", "\u{2615}",
];

type Props = { onPick: (emoji: string) => void; compact?: boolean; buttonStyle?: CSSProperties };

export default function EmojiPicker({ onPick, compact, buttonStyle }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const trigger: CSSProperties = compact
    ? { padding: "1px 6px", fontSize: 14, cursor: "pointer", border: "1px solid var(--ui-border)", borderRadius: 4, background: "transparent" }
    : { width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--ui-border)", background: "var(--ui-surface)", fontSize: 18, cursor: "pointer", flexShrink: 0 };

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-testid="emoji-picker-button"
        title="Insert emoji"
        aria-label="Insert emoji"
        aria-expanded={open}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        style={{ ...trigger, ...buttonStyle }}
      >
        {"\u{1f642}"}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Emoji"
          data-testid="emoji-picker-panel"
          style={{ position: "absolute", bottom: compact ? undefined : "calc(100% + 6px)", top: compact ? "calc(100% + 4px)" : undefined, left: 0, zIndex: 50, width: 272, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, padding: 8, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Insert ${emoji}`}
              onMouseDown={(e) => { e.preventDefault(); onPick(emoji); setOpen(false); }}
              style={{ fontSize: 20, lineHeight: "28px", padding: 0, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6 }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
