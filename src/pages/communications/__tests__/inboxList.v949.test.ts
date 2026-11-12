// BF_PORTAL_v949_INBOX_LIMIT
import { describe, expect, it } from "vitest";
import { inboxListStats, limitedInboxList } from "../inboxList";

const gate = () => { let open!: (v: string) => void; const p = new Promise<string>((r) => { open = r; }); return { p, open }; };

describe("inbox list queue", () => {
  it("never has more than two inbox requests in flight", async () => {
    const gates = [gate(), gate(), gate(), gate()];
    let started = 0;
    const all = gates.map((g, i) => limitedInboxList({ mailbox: `m${i}` }, () => { started += 1; return g.p; }));
    await Promise.resolve();
    expect(started).toBe(2);
    expect(inboxListStats()).toEqual({ active: 2, waiting: 2 });
    gates[0]!.open("a");
    await all[0];
    await Promise.resolve();
    expect(started).toBe(3);
    gates.slice(1).forEach((g) => g.open("x"));
    await Promise.all(all);
    expect(inboxListStats()).toEqual({ active: 0, waiting: 0 });
  });

  it("an identical request already in flight is shared, not sent again", async () => {
    const g = gate();
    let calls = 0;
    const load = () => { calls += 1; return g.p; };
    const a = limitedInboxList({ mailbox: "info", folder: "inbox" }, load);
    const b = limitedInboxList({ folder: "inbox", mailbox: "info" }, load);
    g.open("done");
    expect(await a).toBe("done");
    expect(await b).toBe("done");
    expect(calls).toBe(1);
    await limitedInboxList({ mailbox: "info", folder: "inbox" }, async () => { calls += 1; return "again"; });
    expect(calls).toBe(2);
  });

  it("a failed request frees its place in the queue", async () => {
    await expect(limitedInboxList({ mailbox: "bad" }, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(inboxListStats()).toEqual({ active: 0, waiting: 0 });
  });
});
