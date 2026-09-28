// BF_PORTAL_TEAM_NOTIFY_v644
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldAlert } from "../TeamNotifier";

const app = readFileSync("src/App.tsx", "utf8");
describe("when a Team message alerts", () => {
  const base = { mine: false, muted: false, mentioned: false, dnd: false, onScreen: false };
  it("alerts for others' messages you are not looking at", () => expect(shouldAlert(base)).toBe(true));
  it("never for your own, or the conversation on screen", () => {
    expect(shouldAlert({ ...base, mine: true })).toBe(false);
    expect(shouldAlert({ ...base, onScreen: true })).toBe(false);
  });
  it("muted: only @mentions", () => {
    expect(shouldAlert({ ...base, muted: true })).toBe(false);
    expect(shouldAlert({ ...base, muted: true, mentioned: true })).toBe(true);
  });
  it("Do Not Disturb: nothing", () => expect(shouldAlert({ ...base, mentioned: true, dnd: true })).toBe(false));
});

describe("wiring", () => {
  it("the notifier is always mounted", () => expect(app).toContain("<TeamNotifier />"));
});
