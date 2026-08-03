// BF_PORTAL_OUTBOUND_CALL_LOG_TO_v3
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.join(process.cwd(), "src/dialer/actions.ts"), "utf8");

describe("outbound call logging", () => {
  it("sends To alongside conferenceFriendly so the server can write call_logs", () => {
    expect(src).toContain("connect({params:{conferenceFriendly:body.conferenceFriendly,To:to}})");
  });

  it("still joins by conference friendly name", () => {
    expect(src).toContain("conferenceFriendly:body.conferenceFriendly");
  });

  // Internal staff calls have no PSTN leg, so there is no number to log and
  // nothing to add there.
  it("leaves the internal call path alone", () => {
    const internal = src.slice(src.indexOf("export async function startInternalCall"));
    expect(internal).toContain("connect({params:{conferenceFriendly:body.conferenceFriendly}})");
  });
});
