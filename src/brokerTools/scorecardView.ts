// BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS - how scorecard bands read and are typed: "-1:10, 1-2:40, 2-5:70, 5-:100"
// (from - to : points; a blank end is open).
export type Band = { min: number | null; max: number | null; points: number };

export function bandsText(bands: Band[]): string {
  return bands.map((b) => `${b.min ?? ""}-${b.max ?? ""}:${b.points}`).join(", ");
}

export function parseBands(text: string): Band[] | null {
  const out: Band[] = [];
  for (const part of text.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = /^(-?\d*\.?\d*)\s*-\s*(\d*\.?\d*)\s*:\s*(\d+(?:\.\d+)?)$/.exec(part);
    if (!m) return null;
    out.push({ min: m[1] === "" ? null : Number(m[1]), max: m[2] === "" ? null : Number(m[2]), points: Number(m[3]) });
  }
  return out.length ? out : null;
}

export const OUTCOME_LABEL: Record<string, string> = { clear: "No rule hit", note: "Note", refer: "Refer", decline: "Decline signal" };
export const OUTCOME_TONE: Record<string, "green" | "blue" | "amber" | "red"> = { clear: "green", note: "blue", refer: "amber", decline: "red" };
