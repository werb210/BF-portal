// BF_PORTAL_v846_FRAUD - how each result looks. Dark text on a light tint (every pair at least 7:1), so each chip and
// notice reads clearly on both the light and dark portal themes. Words always accompany the colour.
import type { CSSProperties } from "react";
import type { CheckState } from "@/fraud/fraudApi";

export type ChipStyle = { label: string; bg: string; fg: string; border: string };

export const STATUS_STYLE: Record<CheckState, ChipStyle> = {
  green: { label: "No concerns", bg: "#dcfce7", fg: "#14532d", border: "#86efac" },
  amber: { label: "Worth a look", bg: "#fef3c7", fg: "#78350f", border: "#fcd34d" },
  red: { label: "Concern", bg: "#fee2e2", fg: "#7f1d1d", border: "#fca5a5" },
  not_configured: { label: "Not set up", bg: "#e2e8f0", fg: "#1e293b", border: "#cbd5e1" },
  not_applicable: { label: "No data yet", bg: "#f1f5f9", fg: "#334155", border: "#cbd5e1" },
  error: { label: "Could not run", bg: "#ffedd5", fg: "#7c2d12", border: "#fdba74" },
  pending: { label: "Waiting to run", bg: "#e0f2fe", fg: "#0c4a6e", border: "#7dd3fc" },
  per_document: { label: "Per document", bg: "#e0f2fe", fg: "#0c4a6e", border: "#7dd3fc" },
};

export const BAND_STYLE: Record<"low" | "medium" | "high", ChipStyle> = {
  low: { label: "Low risk", ...pick(STATUS_STYLE.green) },
  medium: { label: "Needs a closer look", ...pick(STATUS_STYLE.amber) },
  high: { label: "High risk", ...pick(STATUS_STYLE.red) },
};

function pick(s: ChipStyle): Omit<ChipStyle, "label"> {
  return { bg: s.bg, fg: s.fg, border: s.border };
}

export function chipStyle(status: string): ChipStyle {
  return STATUS_STYLE[(status in STATUS_STYLE ? status : "not_applicable") as CheckState];
}

/** A message box with its own light background, so its text stays readable on the dark theme too. */
export function noticeStyle(kind: "error" | "warning"): CSSProperties {
  const s = kind === "error" ? STATUS_STYLE.red : STATUS_STYLE.amber;
  return { margin: "8px 0 0", padding: "8px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.45, background: s.bg, color: s.fg, border: `1px solid ${s.border}` };
}

/** WCAG contrast ratio between two #rrggbb colours (used by the tests to keep the chips readable). */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}
