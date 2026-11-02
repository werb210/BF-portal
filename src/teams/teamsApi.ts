// BF_PORTAL_v870_CRM_DATA_MODEL - teams and record visibility (BF-Server /api/teams; ported from KS-Portal #36).
import { useEffect, useState } from "react";
import { api } from "@/api";

export type Visibility = "all" | "team" | "own";
export type Team = { id: string; name: string; description: string | null; archived_at: string | null; members: Array<{ user_id: string }> };
export type TeamUser = {
  id: string; email: string; role: string | null; first_name: string | null; last_name: string | null;
  primary_team_id: string | null; record_visibility: Visibility | null; team_ids: string[];
};
export type TeamsOverview = { teams: Team[]; users: TeamUser[]; role_visibility: Record<string, Visibility>; roles: string[] };

export const VISIBILITY_LABEL: Record<Visibility, string> = { all: "All records", team: "Team's records", own: "Own records only" };
export const VISIBILITY_HELP: Record<Visibility, string> = {
  all: "Sees every contact, company and deal.",
  team: "Sees records owned by anyone on one of their teams.",
  own: "Sees only records they own (or deals they are assigned to).",
};

export const getTeams = () => api.get<TeamsOverview>("/api/teams");
export const createTeam = async (name: string, description = "") => (await api.post<{ team: Team }>("/api/teams", { name, description })).team;
export const renameTeam = (id: string, body: { name?: string; description?: string }) => api.patch(`/api/teams/${id}`, body);
export const setTeamArchived = (id: string, archived: boolean) => api.post(`/api/teams/${id}/${archived ? "archive" : "unarchive"}`);
export const setTeamMembers = (id: string, userIds: string[]) => api.put(`/api/teams/${id}/members`, { user_ids: userIds });
export const updateTeamUser = (userId: string, body: { primary_team_id?: string | null; record_visibility?: Visibility | null; team_ids?: string[] }) =>
  api.put<{ user: Pick<TeamUser, "id" | "primary_team_id" | "record_visibility" | "team_ids"> }>(`/api/teams/users/${userId}`, body);
export const setRoleVisibility = (body: Record<string, Visibility>) => api.put("/api/teams/visibility/roles", body);
export const getMyVisibility = () => api.get<{ visibility: Visibility; teams: Array<{ id: string; name: string; is_primary: boolean }>}>("/api/teams/me");

/** Active teams for the Team filter; empty until an Admin creates a team. */
export function useTeamOptions(): Array<{ id: string; name: string }> {
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let off = false;
    Promise.resolve().then(() => api.get<{ teams: Array<{ id: string; name: string }> }>("/api/teams/options"))
      .then((r) => { if (!off) setTeams(Array.isArray(r?.teams) ? r.teams : []); })
      .catch(() => { if (!off) setTeams([]); });
    return () => { off = true; };
  }, []);
  return teams;
}

export const userName = (u: Pick<TeamUser, "first_name" | "last_name" | "email">) =>
  `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
