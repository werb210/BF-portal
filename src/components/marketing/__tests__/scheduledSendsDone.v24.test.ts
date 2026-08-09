// BF_PORTAL_SCHEDULED_SENDS_DONE_v24
import { describe, expect, it } from "vitest";
import { pendingSends, sendJobCancelPath } from "../scheduledSends";

const NOW = new Date("2026-08-09T18:00:00.000Z");
const future = "2026-08-10T15:30:00.000Z";

describe("BF's terminal status is 'done'", () => {
  it("hides a BF blast that already finished", () => {
    const rows = [
      { id: "a", subject: "already sent", status: "done", not_before: null },
      { id: "b", subject: "still queued", status: "queued", not_before: future },
    ];
    expect(pendingSends(rows, NOW).map((job) => job.name)).toEqual(["still queued"]);
  });

  it("hides a job the worker gave up on", () => {
    expect(pendingSends([{ id: "a", subject: "x", status: "error" }], NOW)).toHaveLength(0);
  });

  it("still shows a running blast, which is cancellable", () => {
    expect(pendingSends([{ id: "a", subject: "x", status: "running" }], NOW)).toHaveLength(1);
  });
});

describe("cancel honours the same silo mount as the list", () => {
  it("BI cancels under /email", () => {
    expect(sendJobCancelPath("/api/v1/bi/marketing", "j1")).toBe("/api/v1/bi/marketing/email/send-jobs/j1/cancel");
  });
  it("BF cancels without it", () => {
    expect(sendJobCancelPath("/api/marketing", "j1")).toBe("/api/marketing/send-jobs/j1/cancel");
  });
});

describe("the campaign name comes from the subject BF now returns", () => {
  it("uses the subject rather than the audience tag", () => {
    const rows = [{ id: "a", subject: "Which of these are you?", tag: "", status: "queued", not_before: future, total: 729 }];
    expect(pendingSends(rows, NOW)[0]).toMatchObject({ name: "Which of these are you?", total: 729 });
  });
});
