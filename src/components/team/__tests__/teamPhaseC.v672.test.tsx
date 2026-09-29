// BF_PORTAL_TEAM_PHASE_C_v672
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const posted = vi.hoisted(() => [] as Array<[string, any]>);
vi.mock("@/api", () => {
  const get = vi.fn(async (url: string, opts?: any) => {
    if (url === "/api/team/cards") {
      const ids = String(opts?.params?.ids ?? "").split(",");
      return { cards: ids.map((k) => { const [kind, id] = k.split(":"); return { kind, id, title: kind === "contact" ? "Sam Lee" : "Todd's Gym LOC", subtitle: "Offer · $150,000", url: (kind === "contact" ? "/crm/contacts/" : "/applications/") + id }; }) };
    }
    return {};
  });
  return { api: Object.assign(get, { post: vi.fn(async (u: string, b: any) => { posted.push([u, b]); return { ok: true }; }), delete: vi.fn(async () => ({ ok: true })), patch: vi.fn(), put: vi.fn() }) };
});

import { cardRefs, remindTime, SaveMenu, TeamCards } from "@/components/team/TeamPhaseC";
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("Team Phase C", () => {
  it("finds linked contacts and applications once each", () => {
    expect(cardRefs("https://staff.boreal.financial/crm/contacts/" + ID + " then /applications/" + ID + " and /crm/contacts/" + ID)).toEqual(["contact:" + ID, "application:" + ID]);
  });
  it("remind times", () => {
    const now = new Date("2026-09-28T15:00:00Z");
    expect(remindTime("20m", now)).toBe("2026-09-28T15:20:00.000Z");
    expect(remindTime("save", now)).toBeNull();
    expect(new Date(remindTime("tomorrow", now) as string).getHours()).toBe(9);
  });
  it("shows cards for links in a message", async () => {
    render(<MemoryRouter><TeamCards text={"Look at /applications/" + ID + " for /crm/contacts/" + ID} /></MemoryRouter>);
    await screen.findByText("Todd's Gym LOC");
    expect(screen.getAllByTestId("team-card")).toHaveLength(2);
  });
  it("saves with a reminder", async () => {
    render(<SaveMenu messageId="m1" />);
    fireEvent.click(screen.getByTestId("team-save"));
    fireEvent.click(screen.getByText("Remind me in 1 hour"));
    await waitFor(() => expect(posted.some(([u, b]) => u === "/api/team/messages/m1/save" && typeof b.remind_at === "string")).toBe(true));
    await screen.findByText("Reminder set");
  });
  it("is wired into the Team tab, thread panel and alerts", () => {
    const page = readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");
    for (const id of ["team-saved", "team-dm-call"]) expect(page).toContain('data-testid="' + id + '"');
    expect(page).toContain("<TeamCards text={m.body} />");
    expect(page).toContain("<SaveMenu messageId={m.id}");
    expect(page).toContain("m.bot || userName(m.sender_id)");
    expect(page).toContain("startInternalCall(other");
    expect(readFileSync("src/components/team/ThreadPanel.tsx", "utf8")).toContain("<TeamCards text={m.body} />");
    expect(readFileSync("src/components/team/TeamNotifier.tsx", "utf8")).toContain('d?.type === "reminder"');
  });
});
