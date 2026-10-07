// BF_PORTAL_DASH_TEAM_MESSAGES_v758
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...args: unknown[]) => get(...args), put: vi.fn() } }));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "x." + btoa(JSON.stringify({ sub: "me" })) + ".y" }));
import TeamMessagesCard, { TEAM_MESSAGE_EVENT, unreadConversations, conversationTitle, previewText, teamLink } from "../TeamMessagesCard";
import { withTeamCardOnce, defaultCards } from "../DashboardHome";

const channels = [
  { id: "c1", kind: "dm", name: null, member_ids: ["me", "andrew"], unread_count: 2, last_message: { sender_id: "andrew", body: "Walter says the loan was paid", created_at: "2026-10-07T18:00:00Z" } },
  { id: "c2", kind: "channel", name: "general", member_ids: ["me"], unread_count: 1, has_mention: true, last_message: { sender_id: "caden", body: "@Todd **look**", created_at: "2026-10-07T10:00:00Z" } },
  { id: "c3", kind: "channel", name: "muted", muted: true, unread_count: 5, last_message: null },
  { id: "c4", kind: "dm", name: null, member_ids: ["me", "caden"], unread_count: 0, last_message: null },
];
function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }

beforeEach(() => {
  get.mockReset();
  get.mockImplementation(async (url: string) => url === "/api/team/users"
    ? { users: [{ id: "andrew", name: "Andrew Polturak" }, { id: "caden", name: "Caden Werboweski" }] }
    : { channels });
});

describe("New team messages card", () => {
  it("lists unread conversations, mentions first, skipping muted (unless mentioned) and read ones", () => {
    expect(unreadConversations(channels).map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(conversationTitle(channels[0]!, new Map([["andrew", "Andrew Polturak"]]), "me")).toBe("Andrew Polturak");
    expect(conversationTitle(channels[1]!, new Map(), "me")).toBe("#general");
    expect(previewText("@Todd **look**")).toBe("@Todd look");
    expect(previewText("")).toBe("Sent an attachment");
  });
  it("clicking a conversation opens it in Communications > Team", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="/dashboard" element={<TeamMessagesCard />} /><Route path="/communications" element={<Where />} /></Routes></MemoryRouter>);
    const rows = await screen.findAllByTestId("dash-team-row");
    expect(rows).toHaveLength(2);
    expect(rows[1]!.textContent).toContain("Andrew Polturak");
    fireEvent.click(rows[1]!);
    expect(screen.getByTestId("where").textContent).toBe(teamLink("c1"));
    expect(teamLink("c1")).toBe("/communications?tab=team&channel=c1");
  });
  it("refreshes when a Team message arrives", async () => {
    render(<MemoryRouter><TeamMessagesCard /></MemoryRouter>);
    await screen.findAllByTestId("dash-team-row");
    const before = get.mock.calls.filter((c) => c[0] === "/api/team/channels").length;
    await act(async () => { window.dispatchEvent(new CustomEvent(TEAM_MESSAGE_EVENT)); });
    expect(get.mock.calls.filter((c) => c[0] === "/api/team/channels").length).toBe(before + 1);
  });
  it("says so when there is nothing new", async () => {
    get.mockImplementation(async (url: string) => url === "/api/team/users" ? { users: [] } : { channels: [channels[3]] });
    render(<MemoryRouter><TeamMessagesCard /></MemoryRouter>);
    expect(await screen.findByText("No new team messages.")).toBeTruthy();
  });
});

describe("the card on the Dashboard", () => {
  it("is a standard card right under Key numbers", () => {
    expect(defaultCards().map((c) => c.report).slice(0, 2)).toEqual(["dash_kpis", "dash_team"]);
  });
  it("is added once to layouts saved before it existed, and stays removed if removed", () => {
    const saved = [{ id: "dash_kpis", report: "dash_kpis", size: "full" as const }, { id: "x", report: "dash_pipeline", size: "full" as const }];
    expect(withTeamCardOnce(saved, false).cards.map((c) => c.report)).toEqual(["dash_kpis", "dash_team", "dash_pipeline"]);
    expect(withTeamCardOnce(saved, true)).toEqual({ cards: saved, added: false });
  });
  it("TeamNotifier re-broadcasts incoming messages", () => {
    expect(readFileSync("src/components/team/TeamNotifier.tsx", "utf8")).toContain("new CustomEvent(TEAM_MESSAGE_EVENT");
  });
});
