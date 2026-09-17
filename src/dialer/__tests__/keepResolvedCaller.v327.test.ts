// BF_PORTAL_KEEP_RESOLVED_CALLER_v327
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const provider = readFileSync(resolve(__dirname, "..", "DialerProvider.tsx"), "utf-8");
const toast = readFileSync(resolve(__dirname, "..", "components", "IncomingCallToast.tsx"), "utf-8");

describe("a resolved caller is never relabelled Unknown", () => {
  it("merges into the existing incoming instead of replacing it", () => {
    expect(provider).toContain("const prior = useDialer.getState().incoming;");
    expect(provider).toContain("const alreadyResolved = !!prior?.contactId;");
    expect(provider).toContain("fromDisplay: prior.fromDisplay,");
  });

  it("stops before the second lookup can overwrite the first answer", () => {
    expect(provider).toContain("if (alreadyResolved) return;");
  });

  it("still takes the pending call object from whichever event carries it", () => {
    // Without this, keeping the earlier identity would throw away the Twilio
    // call object and the Answer button would have nothing to accept.
    expect(provider).toContain("pendingCall: base.pendingCall ?? prior.pendingCall");
  });

  it("leaves an unresolved ring on the normal path", () => {
    expect(provider).toContain('useDialer.getState().setCtx({ contactName: "Unknown caller"');
  });
});

describe("the toast says which deal is calling", () => {
  it("shows the business and application under the name", () => {
    expect(toast).toContain("(incoming.companyName || incoming.applicationName)");
    expect(toast).toContain('[incoming.companyName, incoming.applicationName].filter(Boolean).join(" · ")');
  });

  it("keeps the number as its own line", () => {
    expect(toast).toContain("{incoming.phone}");
  });
});
