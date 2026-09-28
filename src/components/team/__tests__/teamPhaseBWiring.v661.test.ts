// BF_PORTAL_TEAM_PHASE_B_v661
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");

describe("Team tab wiring", () => {
  it("has browse, search everywhere, details, threads, formatting and a multi-line box", () => {
    for (const id of ["team-browse", "team-search-all", "team-channel-details", "team-thread-link", "team-reply-thread", "team-draft"]) expect(page).toContain('data-testid="' + id + '"');
    expect(page).toContain('data?.type === "thread_message"');
    expect(page).toContain("<ThreadPanel ");
    expect(page).toContain("<FormatBar target={draftRef}");
    expect(page).toContain('get("thread")');
    expect(page).toContain("renderTeamText(m.body, memberNames)");
  });
});
