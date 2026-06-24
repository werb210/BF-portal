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

// BF_PORTAL_BLOCK_v_RESKIN_1_ACCENT_FOUNDATION_v1 — set data-silo on <html> so CSS
// resolves --accent (BF blue / BI green). Mirrors applyTheme.
export function applySilo(silo: string | null | undefined): void {
  const root = document.documentElement;
  const s = (silo ?? "BF").toUpperCase();
  root.setAttribute("data-silo", s === "BI" || s === "SLF" ? s : "BF");
}

export function setThemeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
  applyTheme(choice);
}

export function initTheme(): void {
  applyTheme(getThemeChoice());
}
