// BF_PORTAL_v874_MARKETING_TOOLS - lead scores on contacts and the contacts list (ported from KS-Portal #42 without the
// Marketing add-on). useLeadScores(ids) asks BF-Server for the contacts on screen (POST /api/lead-scores/lookup, which
// also refreshes them, in the silo chosen in the topbar). The server only answers for contacts the person may see; a
// silo without lead scoring (or an error) shows nothing.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

export type LeadScore = { score: number; grade: "hot" | "warm" | "cold"; breakdown?: Array<{ label: string; points: number }> };

// Dark text on light tints: readable in the light and dark portal themes.
const TONE: Record<LeadScore["grade"], { background: string; color: string; label: string }> = {
  hot: { background: "#fee2e2", color: "#7f1d1d", label: "Hot" },
  warm: { background: "#fef3c7", color: "#78350f", label: "Warm" },
  cold: { background: "#e2e8f0", color: "#1e293b", label: "Cold" },
};

export function LeadScoreBadge({ score, showLabel = true }: { score: Pick<LeadScore, "score" | "grade" | "breakdown">; showLabel?: boolean }) {
  const t = TONE[score.grade] ?? TONE.cold;
  const title = score.breakdown?.length ? score.breakdown.map((b) => `${b.label}: ${b.points > 0 ? "+" : ""}${b.points}`).join("\n") : undefined;
  return (
    <span
      data-testid="lead-score"
      title={title}
      aria-label={`Lead score ${score.score} of 100, ${t.label.toLowerCase()}`}
      style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: t.background, color: t.color, whiteSpace: "nowrap" }}
    >
      {score.score}{showLabel ? ` ${t.label}` : ""}
    </span>
  );
}

/** Scores for the given contacts ({} while loading, in a silo without lead scoring, or on an error). */
export function useLeadScores(contactIds: string[]): Record<string, LeadScore> {
  const key = useMemo(() => [...new Set(contactIds.filter(Boolean))].sort().join(","), [contactIds]);
  const [scores, setScores] = useState<Record<string, LeadScore>>({});
  useEffect(() => {
    if (!key) { setScores({}); return; }
    let cancelled = false;
    api.post<{ enabled?: boolean; scores?: Record<string, LeadScore>; data?: { scores?: Record<string, LeadScore> } }>("/api/lead-scores/lookup", { contact_ids: key.split(",") })
      .then((r) => { if (!cancelled) setScores(r?.scores ?? r?.data?.scores ?? {}); })
      .catch(() => { if (!cancelled) setScores({}); });
    return () => { cancelled = true; };
  }, [key]);
  return scores;
}

/** One contact's score badge (nothing until it loads). */
export function ContactLeadScore({ contactId }: { contactId: string }) {
  const scores = useLeadScores(useMemo(() => [contactId], [contactId]));
  const s = scores[contactId];
  return s ? <LeadScoreBadge score={s} /> : null;
}
