// BF_PORTAL_v870_CRM_DATA_MODEL - "All teams / <team>" for the pipeline and reports. Hidden until an Admin creates a
// team. Choosing a team narrows to records owned by its members (never widens what the user may see).
import { useSyncExternalStore, type CSSProperties } from "react";
import { useTeamOptions } from "./teamsApi";

const select: CSSProperties = { padding: "6px 8px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13 };

export default function TeamFilter({ value, onChange }: { value: string; onChange: (teamId: string) => void }) {
  const teams = useTeamOptions();
  if (!teams.length) return null;
  return (
    <select aria-label="Team" data-testid="team-filter" style={select} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All teams</option>
      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}

// The Reports page shares one team choice across every card on it.
let reportTeam = "";
const listeners = new Set<() => void>();
export function setReportTeam(id: string): void {
  reportTeam = id;
  for (const l of listeners) l();
}
export function useReportTeam(): string {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => reportTeam, () => reportTeam);
}
/** Adds team_id to a report URL when a team is chosen. */
export function withTeam(url: string, teamId: string): string {
  if (!teamId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}team_id=${encodeURIComponent(teamId)}`;
}
