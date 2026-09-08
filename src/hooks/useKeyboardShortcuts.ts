// BF_PORTAL_BLOCK_v640_IPAD_WORKSTATION_v1
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export type Shortcut = { keys: string; label: string; run: () => void };

/** True when focus is in a field, so shortcuts never eat real typing. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

export function buildShortcuts(navigate: (to: string) => void, openHelp: () => void): Shortcut[] {
  return [
    // BF_PORTAL_SHORTCUTS_MOUNT_v1 - v640 guessed two of these. The router has
    // no /portal and no /crm/contacts; they are /dashboard and /crm. Verified
    // against App.tsx by the test in this block.
    { keys: "g d", label: "Go to Dashboard", run: () => navigate("/dashboard") },
    { keys: "g p", label: "Go to Pipeline", run: () => navigate("/pipeline") },
    { keys: "g c", label: "Go to CRM", run: () => navigate("/crm") },
    { keys: "g m", label: "Go to Communications", run: () => navigate("/communications") },
    { keys: "g t", label: "Go to Tasks", run: () => navigate("/tasks") },
    { keys: "?", label: "Show keyboard shortcuts", run: openHelp },
  ];
}

export function useKeyboardShortcuts(openHelp: () => void): void {
  const navigate = useNavigate();
  useEffect(() => {
    const shortcuts = buildShortcuts(navigate, openHelp);
    let prefix = "";
    let prefixTimer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (key === "?") { event.preventDefault(); openHelp(); return; }
      if (prefix) {
        const combo = `${prefix} ${key.toLowerCase()}`;
        const match = shortcuts.find((s) => s.keys === combo);
        prefix = ""; clearTimeout(prefixTimer);
        if (match) { event.preventDefault(); match.run(); }
        return;
      }
      if (key.toLowerCase() === "g") {
        prefix = "g";
        // A dangling prefix must expire, or the next unrelated keypress is swallowed.
        prefixTimer = setTimeout(() => { prefix = ""; }, 1500);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); clearTimeout(prefixTimer); };
  }, [navigate, openHelp]);
}
