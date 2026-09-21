// BF_PORTAL_REPORT_CURRENCY_v388 - show CAD and USD amounts as they are, never
// added together, in every report. Same prefixes as the dashboard (CA$ / US$).
const PREFIX: Record<string, string> = { CAD: "CA$", USD: "US$" };

/** ["CA$151,320", "US$20,000"]; empty when there is nothing above zero. */
export function moneyParts(by: Record<string, number> | null | undefined): string[] {
  if (!by || typeof by !== "object") return [];
  return (["CAD", "USD"] as const)
    .filter((code) => (Number(by[code]) || 0) > 0)
    .map((code) => `${PREFIX[code]}${Math.round(Number(by[code])).toLocaleString()}`);
}

/** One currency per line (render with white-space: pre-line); null when empty. */
export function moneyLines(by: Record<string, number> | null | undefined): string | null {
  const parts = moneyParts(by);
  return parts.length ? parts.join("\n") : null;
}

/** Single-line form for narrow table cells: "CA$151,320 / US$20,000"; null when empty. */
export function moneyInline(by: Record<string, number> | null | undefined): string | null {
  const parts = moneyParts(by);
  return parts.length ? parts.join(" / ") : null;
}
