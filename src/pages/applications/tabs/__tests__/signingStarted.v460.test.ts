// BF_PORTAL_BLOCK_v460_SIGNING_STARTED + BF_PORTAL_BLOCK_v462_SIGNING_WHO
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signingNotice, formatPhone } from "../signingStatus";

const brandon = { name: "Brandon Voss", phone: "+19173043342", smsSent: true, lastSentAt: "2026-09-24T17:46:18Z" };

describe("v460/v462 a signing request is not a failed send, and says who", () => {
  it("first Send: names who was texted and where", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: true, notice: brandon }, stageB: { fired: false, reason: "not_ready" } } }, 1);
    expect(n).toEqual({ tone: "success", text: "Signing text sent to Brandon Voss at (917) 304-3342. The package goes to the selected lender automatically once they sign." });
  });
  it("second Send: the text is re-sent", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: false, reason: "already_started", notice: { ...brandon, resent: true } }, stageB: { fired: false, reason: "not_ready" } } }, 2);
    expect(n?.tone).toBe("success");
    expect(n?.text).toBe("Signing text re-sent to Brandon Voss at (917) 304-3342. The package goes to the selected lenders automatically once they sign.");
  });
  it("pressed again too soon: says when it went and when it can be resent", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: false, reason: "already_started", notice: { ...brandon, smsSent: false, throttled: true } }, stageB: { fired: false, reason: "not_ready" } } }, 1);
    expect(n?.tone).toBe("success");
    expect(n?.text).toContain("Waiting for Brandon Voss to sign. The signing text went to (917) 304-3342");
    expect(n?.text).toContain("you can resend it 2 minutes after the last one");
  });
  it("no usable mobile number is an error, with what to do", () => {
    const n = signingNotice({ orchestrator: { stageA: { fired: true, notice: { name: "Brandon Voss", phone: null, smsSent: false } }, stageB: { fired: false, reason: "not_ready" } } }, 1);
    expect(n?.tone).toBe("error");
    expect(n?.text).toContain("has no usable mobile number");
  });
  it("stays out of the way for real sends and real blockers", () => {
    expect(signingNotice({ orchestrator: { stageA: { fired: true }, stageB: { fired: true } } }, 1)).toBeNull();
    expect(signingNotice({ orchestrator: { stageA: { fired: false, reason: "preconditions_not_met" }, stageB: { fired: false, reason: "not_ready" } } }, 1)).toBeNull();
    expect(signingNotice({ orchestrator: { stageB: { fired: false, reason: "dispatch_failed" } } }, 1)).toBeNull();
    expect(signingNotice(undefined, 1)).toBeNull();
  });
  it("formats North American numbers", () => {
    expect(formatPhone("+19173043342")).toBe("(917) 304-3342");
    expect(formatPhone("4033189220")).toBe("(403) 318-9220");
  });
  it("the Lenders tab shows success in green and a missing number in red", () => {
    const src = readFileSync(path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"), "utf8");
    expect(src).toContain("const signing = signingNotice(payload, ids.length);");
    expect(src).toContain('if (signing.tone === "error") { setSendSuccess(null); setSendError(signing.text); return; }');
    expect(src).toContain("setSendSuccess(signing.text);");
  });
});
