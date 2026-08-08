// BF_PORTAL_SEND_LATER_v21
import { describe, expect, it } from "vitest";
import {
  MAX_LEAD_DAYS,
  MIN_LEAD_MINUTES,
  describeSchedule,
  localInputMax,
  localInputMin,
  toIsoInstant,
} from "../sendLater";

const NOW = new Date("2026-08-08T18:00:00.000Z");

describe("toIsoInstant", () => {
  it("returns null for an empty picker, which means send now", () => {
    for (const empty of ["", "   "]) expect(toIsoInstant(empty)).toBeNull();
  });

  it("returns null rather than an invalid instant", () => {
    expect(toIsoInstant("not-a-date")).toBeNull();
  });

  it("converts local wall-clock to an absolute instant", () => {
    const iso = toIsoInstant("2026-08-12T09:30");
    expect(iso).not.toBeNull();
    const parsed = new Date(iso as string);
    // The wall-clock the user typed must survive the round trip in their zone.
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(12);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });

  it("produces a UTC-suffixed string, not a bare local one", () => {
    expect(toIsoInstant("2026-08-12T09:30")).toMatch(/Z$/);
  });
});

describe("picker bounds", () => {
  it("floors at the minimum lead time", () => {
    const min = new Date(localInputMin(NOW));
    expect(min.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + MIN_LEAD_MINUTES * 60_000 - 60_000);
  });

  it("ceilings at the maximum lead time", () => {
    const max = new Date(localInputMax(NOW));
    const expected = NOW.getTime() + MAX_LEAD_DAYS * 86_400_000;
    expect(Math.abs(max.getTime() - expected)).toBeLessThan(86_400_000);
  });

  it("emits the format a datetime-local input accepts", () => {
    expect(localInputMin(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(localInputMax(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("describeSchedule", () => {
  it("says nothing when nothing is scheduled", () => {
    expect(describeSchedule("")).toBe("");
  });

  it("names the timezone, so a wrong hour is visible before sending", () => {
    const text = describeSchedule("2026-09-01T09:30", NOW);
    expect(text).toContain("Sends");
    expect(text.length).toBeGreaterThan(10);
  });

  it("explains that a past time still waits for the hold window", () => {
    expect(describeSchedule("2026-01-01T09:30", NOW)).toContain("hold window");
  });
});
