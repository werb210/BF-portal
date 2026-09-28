// BF_PORTAL_TEAM_NOTIFY_v644 (Team tab - shipped as v645)
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const put = vi.hoisted(() => vi.fn(async (_url: string, body: any) => ({ status: { user_id: "me", ...body, dnd: Boolean(body.dnd_until), away: false } })));
vi.mock("@/api", () => ({ api: Object.assign(vi.fn(async () => ({})), { put, post: vi.fn(async () => ({})), get: vi.fn(async () => ({})) }) }));

import { statusUntil, TeamStatusEditor } from "@/pages/communications/CommunicationsPage";

const page = readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");

describe("status", () => {
  it("clear-after times", () => {
    const now = new Date(2026, 8, 28, 14, 30, 0);
    expect(new Date(statusUntil("1h", now)!).getTime() - now.getTime()).toBe(3600_000);
    const t8 = new Date(statusUntil("tomorrow8", now)!);
    expect([t8.getDate(), t8.getHours(), t8.getMinutes()]).toEqual([29, 8, 0]);
    expect(statusUntil("never", now)).toBeNull();
  });
  it("a preset fills the status and Save sends it", async () => {
    const done = vi.fn();
    render(<TeamStatusEditor onDone={done} />);
    fireEvent.click(screen.getByText(/At lender meeting/));
    fireEvent.change(screen.getByLabelText("Do Not Disturb"), { target: { value: "1h" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const body = (put.mock.calls[0] as unknown as any[])[1];
    expect(body.status_text).toBe("At lender meeting");
    expect(typeof body.dnd_until).toBe("string");
  });
});

describe("wiring", () => {
  it("the Team tab loads dots at once, reports the open conversation, opens ?channel=, offers notifications", () => {
    expect(page).toContain("fetchPresence(); fetchStatuses();");
    expect(page).toContain("setViewingTeamChannel(activeId)");
    expect(page).toContain('new URLSearchParams(window.location.search).get("channel")');
    expect(page).toContain('data-testid="team-notify-prompt"');
  });
  it("mute per conversation and mark unread per message", () => {
    expect(page).toContain("/api/team/channels/${c.id}/mute");
    expect(page).toContain("/api/team/channels/${activeId}/unread");
  });
});
