// BF_PORTAL_BLOCK_v640_IPAD_WORKSTATION_v1
import { buildShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const shortcuts = buildShortcuts(() => {}, () => {});
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 9999 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Keyboard shortcuts</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {shortcuts.map((s) => (
            <li key={s.keys} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>{s.label}</span>
              <kbd style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>{s.keys}</kbd>
            </li>
          ))}
        </ul>
        <button onClick={onClose} style={{ marginTop: 20 }}>Close</button>
      </div>
    </div>
  );
}
