// BF_PORTAL_SCHEDULED_SENDS_v23
import { describe, expect, it } from "vitest";
import { formatSendAt, normalizeSendJob, pendingSends, sendJobsPath } from "../scheduledSends";

const NOW = new Date("2026-08-09T18:00:00.000Z");
const future = "2026-08-10T15:30:00.000Z";

describe("endpoint differs per silo", () => {
  it("BI mounts the list under /email", () => {
    expect(sendJobsPath("/api/v1/bi/marketing")).toBe("/api/v1/bi/marketing/email/send-jobs");
  });
  it("BF does not", () => {
    expect(sendJobsPath("/api/marketing")).toBe("/api/marketing/send-jobs");
  });
});

describe("the two silos return different shapes", () => {
  it("reads the BI shape", () => {
    const job = normalizeSendJob({ id: "1", subject: "Aug 6th - Lenders", recipient_count: 729, scheduled_at: future, status: "queued" });
    expect(job).toEqual({ id: "1", name: "Aug 6th - Lenders", total: 729, sendAt: future, status: "queued" });
  });

  it("reads the BF shape", () => {
    const job = normalizeSendJob({ id: "2", tag: "clients", total: 412, not_before: future, status: "queued" });
    expect(job.name).toBe("clients");
    expect(job.total).toBe(412);
    expect(job.sendAt).toBe(future);
  });

  it("does not show a blank name", () => {
    expect(normalizeSendJob({ id: "3" }).name).toBe("(untitled)");
  });
});

describe("only pending sends are listed", () => {
  it("hides sends that already went", () => {
    const rows = [
      { id: "a", subject: "gone", status: "sent", scheduled_at: future },
      { id: "b", subject: "cancelled", status: "cancelled", scheduled_at: future },
      { id: "c", subject: "failed", status: "failed", scheduled_at: future },
      { id: "d", subject: "pending", status: "queued", scheduled_at: future },
    ];
    expect(pendingSends(rows, NOW).map((job) => job.name)).toEqual(["pending"]);
  });

  it("drops rows with no id rather than rendering a broken cancel button", () => {
    expect(pendingSends([{ subject: "orphan", status: "queued" }], NOW)).toHaveLength(0);
  });

  it("sorts soonest first", () => {
    const rows = [
      { id: "1", subject: "later", status: "queued", scheduled_at: "2026-08-12T10:00:00.000Z" },
      { id: "2", subject: "sooner", status: "queued", scheduled_at: "2026-08-10T10:00:00.000Z" },
    ];
    expect(pendingSends(rows, NOW).map((job) => job.name)).toEqual(["sooner", "later"]);
  });

  it("hides a queued job whose time passed long ago", () => {
    const stale = [{ id: "1", subject: "stale", status: "queued", scheduled_at: "2026-08-01T10:00:00.000Z" }];
    expect(pendingSends(stale, NOW)).toHaveLength(0);
  });
});

describe("the time is readable and names its zone", () => {
  it("names the timezone so a wrong hour is visible", () => {
    const text = formatSendAt(future);
    expect(text.length).toBeGreaterThan(10);
    expect(text).toContain("(");
  });

  it("explains an immediate send rather than showing a blank", () => {
    expect(formatSendAt(null)).toContain("hold window");
  });

  it("does not render Invalid Date", () => {
    expect(formatSendAt("not-a-date")).toBe("Unknown");
  });
});
