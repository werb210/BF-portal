// BF_PORTAL_NEGATIVES_AUTO_MATCH_v433
// Staff should tick the wasted searches and click one button. Choosing between
// Google's PHRASE and EXACT is a judgement about blast radius, made worse by the
// fact that the words describe a mechanism rather than a consequence. The panel
// makes the call from the data it already has.
export type MatchType = "PHRASE" | "EXACT" | "BROAD";

// BF_PORTAL_BLOCK_v528 - BROAD blocks any search that has every word of the term,
// in any order ("loan free business" for "free business loan"). It is only chosen
// when the wasted variants on the list are reworded ones PHRASE would miss.
function words(v: string): string[] {
  return String(v ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}
export function hasAllWords(candidate: string, term: string): boolean {
  const have = new Set(words(candidate));
  const need = words(term);
  return need.length > 0 && need.every((w) => have.has(w));
}

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

  // BF_PORTAL_BLOCK_v528 - nothing contains the phrase as written, but reworded
  // versions of it (same words, other order or with words in between) are on the list.
  if (family.length === 0) {
    const broadFamily = allTerms
      .map((x) => String(x ?? "").trim())
      .filter((x) => x.toLowerCase() !== t && hasAllWords(x, t));
    const broadKillsAConverter = converting.some((c) => hasAllWords(String(c ?? ""), t));
    if (broadFamily.length > 0 && !broadKillsAConverter) {
      return {
        term,
        matchType: "BROAD",
        reason: `Blocks any search using all the words in "${term}", in any order — including ${broadFamily.length} other search${broadFamily.length === 1 ? "" : "es"} on this list.`,
        alsoBlocks: broadFamily,
      };
    }
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
  const broad = decided.filter((d) => d.matchType === "BROAD").map((d) => d.term); // BF_PORTAL_BLOCK_v528
  return [
    ...(phrase.length ? [{ matchType: "PHRASE" as const, terms: phrase }] : []),
    ...(broad.length ? [{ matchType: "BROAD" as const, terms: broad }] : []),
    ...(exact.length ? [{ matchType: "EXACT" as const, terms: exact }] : []),
  ];
}
