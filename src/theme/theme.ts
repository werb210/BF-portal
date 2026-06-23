export type ThemeChoice = "system" | "light" | "dark";

const KEY = "bf_theme";

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  // BF_PORTAL_BLOCK_v_THEME_DIALER_v1 — default to the dialer dark look for users with no saved
  // preference. Light/System remain available via the Settings toggle
  // (persisted), so this is fully reversible.
  return "dark";
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function setThemeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
  applyTheme(choice);
}

export function initTheme(): void {
  applyTheme(getThemeChoice());
}
