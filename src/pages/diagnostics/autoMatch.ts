// BF_PORTAL_NEGATIVES_AUTO_MATCH_v433
// Staff should tick the wasted searches and click one button. Choosing between
// Google's PHRASE and EXACT is a judgement about blast radius, made worse by the
// fact that the words describe a mechanism rather than a consequence. The panel
// makes the call from the data it already has.
export type MatchType = "PHRASE" | "EXACT";

export type AutoMatch = {
  term: string;
  matchType: MatchType;
  /** Plain-language reason, shown on the row. No Google jargon. */
  reason: string;
  /** Other listed terms this choice also blocks. */
  alsoBlocks: string[];
};

/**
 * @param term        the ticked search term
 * @param allTerms    every term currently listed (not just the ticked ones)
 * @param converting  searches known to have converted; PHRASE is never used if
 *                    it would catch one of these
 */
export function chooseMatch(term: string, allTerms: string[], converting: string[] = []): AutoMatch {
  const t = String(term ?? "").trim().toLowerCase();
  if (!t) return { term, matchType: "EXACT", reason: "Blocks only this search.", alsoBlocks: [] };

  // Google rejects a single-word PHRASE negative outright.
  if (!t.includes(" ")) {
    return { term, matchType: "EXACT", reason: "Blocks only this exact search.", alsoBlocks: [] };
  }

  const family = allTerms
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.toLowerCase() !== t && x.toLowerCase().includes(t));

  // Never let an automatic PHRASE take out something that has converted.
  const wouldKillAConverter = converting.some((c) => String(c ?? "").toLowerCase().includes(t));
  if (wouldKillAConverter) {
    return {
      term,
      matchType: "EXACT",
      reason: "Blocks only this search — a similar search has converted before.",
      alsoBlocks: [],
    };
  }

  if (family.length > 0) {
    return {
      term,
      matchType: "PHRASE",
      reason: `Blocks anything containing "${term}" — including ${family.length} other search${family.length === 1 ? "" : "es"} on this list.`,
      alsoBlocks: family,
    };
  }

  return { term, matchType: "EXACT", reason: "Blocks only this exact search.", alsoBlocks: [] };
}

/** Group ticked terms into the per-match batches the API expects. */
export function batchByMatch(
  picked: string[],
  allTerms: string[],
  converting: string[] = [],
): Array<{ matchType: MatchType; terms: string[] }> {
  const decided = picked.map((term) => chooseMatch(term, allTerms, converting));
  const phrase = decided.filter((d) => d.matchType === "PHRASE").map((d) => d.term);
  const exact = decided.filter((d) => d.matchType === "EXACT").map((d) => d.term);
  return [
    ...(phrase.length ? [{ matchType: "PHRASE" as const, terms: phrase }] : []),
    ...(exact.length ? [{ matchType: "EXACT" as const, terms: exact }] : []),
  ];
}
