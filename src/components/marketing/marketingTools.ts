// BF_PORTAL_v874_MARKETING_TOOLS - small helpers shared by the marketing tools (lead scoring, campaign send options,
// the campaign report and the website kit), ported from KS-Portal #42 without the Marketing add-on gates.

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});

/** The server's plain-words reason from a failed request, else the fallback. Error codes (snake_case) never show. */
export function serverMessage(e: unknown, fallback: string): string {
  const d = obj((e as { details?: unknown } | null)?.details);
  const inner = obj(d.error);
  const m = typeof d.message === "string" ? d.message : typeof inner.message === "string" ? inner.message : "";
  return m.trim() && !/^[a-z_]+$/.test(m.trim()) ? m.trim() : fallback;
}

/** Answers come bare or in the respondOk envelope ({ data }). */
export const unwrap = <T,>(res: unknown): T => ((res as { data?: T })?.data ?? res) as T;
