// BF_PORTAL_BLOCK_v640_IPAD_WORKSTATION_v1
import { buildShortcuts } from "@/hooks/useKeyboardShortcuts";
import { COMMAND_SHORTCUTS } from "@/hooks/useCommandShortcuts"; // BF_PORTAL_IPAD_WIRING_v238

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const shortcuts = [...buildShortcuts(() => {}, () => {}), ...COMMAND_SHORTCUTS];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 9999 }}
    >
      {/* BF_PORTAL_v789_CONTRAST - theme tokens instead of a fixed white panel. */}
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Keyboard shortcuts</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {shortcuts.map((s) => (
            <li key={s.keys} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>{s.label}</span>
              <kbd style={{ fontFamily: "monospace", background: "var(--ui-surface-muted)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", padding: "2px 8px", borderRadius: 4 }}>{s.keys}</kbd>
            </li>
          ))}
        </ul>
        <button onClick={onClose} style={{ marginTop: 20, background: "var(--ui-surface-muted)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}
