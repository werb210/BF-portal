// BF_PORTAL_TV_SCOREBOARD_v1 - the sales scoreboard (BF-Server /api/scoreboard): the Leaderboard report and Settings >
// Screens, the office TVs running the Apple TV app.
import { api } from "@/api";

export type BrokerRow = { user_id: string; name: string; initials: string; photo_url: string | null; team_id: string | null; team: string | null;
  volume: number; deals: number; goal: number | null; rank: number; movement: number };
export type TeamRow = { id: string; name: string; volume: number; deals: number; goal: number | null; brokers: number; rank: number };
export type Board = {
  period: { month: string; label: string; days_left: number }; currency: string;
  brokers: BrokerRow[]; teams: TeamRow[]; office: { volume: number; deals: number; goal: number | null };
  recent: Array<{ id: string; broker: string; initials: string; team: string | null; amount: number; funded_at: string }>;
};
export type Screen = { id: string; name: string; team_ids: string[] | null; slides: string[]; rotate_seconds: number; created_at: string; last_seen_at: string | null };
export type ScreenInput = { name: string; team_ids: string[] | null; slides: string[]; rotate_seconds: number };

export const SLIDE_LABEL: Record<string, string> = {
  leaderboard: "Broker leaderboard",
  teams: "Team vs team",
  goal: "Monthly goal",
  recent: "Latest funded deals",
  deals: "Deals funded",
};

export const getBoard = (teamId = "") => api.get<Board>(`/api/scoreboard/board${teamId ? `?team_id=${encodeURIComponent(teamId)}` : ""}`);
export const listScreens = async () => (await api.get<{ screens: Screen[] }>("/api/scoreboard/screens")).screens ?? [];
export const pairScreen = async (code: string, s: ScreenInput) => (await api.post<{ screen: Screen }>("/api/scoreboard/screens/pair", { code, ...s })).screen;
export const updateScreen = async (id: string, s: Partial<ScreenInput>) => (await api.patch<{ screen: Screen }>(`/api/scoreboard/screens/${id}`, s)).screen;
export const removeScreen = (id: string) => api.post(`/api/scoreboard/screens/${id}/remove`, {});

export const money = (n: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
export const pct = (v: number, goal: number | null) => (goal && goal > 0 ? Math.min(Math.round((v / goal) * 100), 999) : null);
