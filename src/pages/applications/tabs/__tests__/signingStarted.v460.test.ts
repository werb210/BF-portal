// BF_PORTAL_BLOCK_v460_SIGNING_STARTED
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signingNotice } from "../signingStatus";

describe("v460 a signing request is not a failed send", () => {
  it("first Send on an unsigned file: signing request sent", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: true }, stageB: { fired: false, reason: "not_ready" } } }, 1);
    expect(n).toBe("Signing request sent to the applicant. The package goes to the selected lender automatically once they sign.");
  });

  it("pressing Send again while waiting", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: false, reason: "already_started" }, stageB: { fired: false, reason: "not_ready" } } }, 2);
    expect(n).toBe("Waiting for the applicant to sign. The package goes to the selected lenders automatically once they sign.");
  });

  it("stays out of the way for real sends and real blockers", () => {
    expect(signingNotice({ orchestrator: { stageA: { fired: true }, stageB: { fired: true } } }, 1)).toBeNull();
    expect(signingNotice({ orchestrator: { stageA: { fired: false, reason: "preconditions_not_met" }, stageB: { fired: false, reason: "not_ready" } } }, 1)).toBeNull();
    expect(signingNotice({ orchestrator: { stageB: { fired: false, reason: "dispatch_failed" } } }, 1)).toBeNull();
    expect(signingNotice(undefined, 1)).toBeNull();
  });

  it("the Lenders tab shows it as a success, not an error", () => {
    const src = readFileSync(path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"), "utf8");
    expect(src).toContain("const signing = signingNotice(payload, ids.length);");
    expect(src).toContain("setSendSuccess(signing);");
    expect(src).toContain("!signingNotice(result, requestedCount) && !describeSendResult(result)");
  });
});
