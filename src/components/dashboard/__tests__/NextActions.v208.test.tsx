// BF_PORTAL_NEXT_ACTIONS_v208
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cmp = readFileSync("src/components/dashboard/NextActions.tsx", "utf-8");
const page = readFileSync("src/pages/dashboard/Dashboard.tsx", "utf-8");

describe("next actions panel", () => {
  it("validates the payload shape before rendering it", () => {
    // The v198 crash came from reading .length off an unvalidated response.
    expect(cmp).toContain("Array.isArray(raw) ? (raw as NextAction[]) : []");
    expect(cmp).toContain("const actions = Array.isArray(data) ? data : [];");
  });

  it("accepts both the wrapped and unwrapped response shapes", () => {
    // mayaStaff returns { ok, actions }; the portal api helper may or may not
    // unwrap .data depending on the route.
    expect(cmp).toContain("(r as any)?.data?.actions ?? (r as any)?.actions");
  });

  it("shows the reason alongside every action", () => {
    expect(cmp).toContain("{a.reason}");
    expect(cmp).toContain("{a.action}");
  });

  it("links each row to the application it is about", () => {
    expect(cmp).toContain("to={`/applications/${encodeURIComponent(a.applicationId)}`}");
  });

  it("says so plainly when there is nothing to chase", () => {
    expect(cmp).toContain("Nothing needs chasing right now.");
  });

  it("distinguishes a failed load from an empty list", () => {
    // Silently showing "nothing to chase" when the call failed would be a lie.
    expect(cmp).toContain("Could not load suggestions.");
    expect(cmp).toMatch(/isError \?/);
  });

  it("stays disabled under test, like the other dashboard cards", () => {
    expect(cmp).toContain('import.meta.env.MODE !== "test"');
  });
});

describe("dashboard", () => {
  it("mounts it full width, not in a half column", () => {
    expect(page).toContain("BF_PORTAL_NEXT_ACTIONS_v208");
    expect(page).toMatch(/<NextActions \/>\n\s*<div className="grid gap-4 md:grid-cols-2">/);
  });

  it("keeps Urgent Actions - the two answer different questions", () => {
    expect(page).toContain("<UrgentActions />");
  });
});
