// BF_PORTAL_IPAD_WIRING_v238
// Cmd shortcuts for the iPad workstation. The v640 hook deliberately ignores
// any key pressed with Cmd, so none of these existed. Kept separate from
// buildShortcuts: those are plain navigation, these depend on where you are.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const APPLICATION_TAB_SHORTCUTS = ["application", "banking-analysis", "financials", "documents"] as const;

export const COMMAND_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Cmd K", label: "Ask Maya / command" },
  { keys: "Cmd 1", label: "Application tab" },
  { keys: "Cmd 2", label: "Banking Analysis tab" },
  { keys: "Cmd 3", label: "Financials tab" },
  { keys: "Cmd 4", label: "Documents tab" },
];

export type CommandAction = { type: "focus-maya" } | { type: "navigate"; to: string };

type KeyLike = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };

export function resolveCommandShortcut(event: KeyLike, pathname: string): CommandAction | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return null;
  const key = event.key.toLowerCase();
  if (key === "k") return { type: "focus-maya" };
  const index = ["1", "2", "3", "4"].indexOf(key);
  if (index < 0) return null;
  const match = /^\/applications\/([^/]+)/.exec(pathname);
  if (!match) return null;
  return { type: "navigate", to: `/applications/${match[1]}/${APPLICATION_TAB_SHORTCUTS[index]}` };
}

export function useCommandShortcuts(): void {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveCommandShortcut(event, location.pathname);
      if (!action) return;
      event.preventDefault();
      if (action.type === "navigate") {
        navigate(action.to);
        return;
      }
      const input = document.querySelector<HTMLTextAreaElement>("[data-maya-command]");
      input?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, location.pathname]);
}
