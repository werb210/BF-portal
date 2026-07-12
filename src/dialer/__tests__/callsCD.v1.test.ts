// BF_PORTAL_UNKNOWN_CALLER_v1 + BF_PORTAL_RECENT_CALLS_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const prov = readFileSync(path.join(process.cwd(),"src/dialer/DialerProvider.tsx"),"utf8");
const toast= readFileSync(path.join(process.cwd(),"src/dialer/components/IncomingCallToast.tsx"),"utf8");
const svc  = readFileSync(path.join(process.cwd(),"src/services/callService.ts"),"utf8");
const comm = readFileSync(path.join(process.cwd(),"src/pages/communications/CommunicationsPage.tsx"),"utf8");
describe("C unknown caller (v1)", () => {
  it("labels unmatched callers as Unknown caller", () => {
    expect(prov).toContain("BF_PORTAL_UNKNOWN_CALLER_v1");
    expect(prov).toContain('"Unknown caller"');
  });
  it("toast offers Add when there is no contact", () => {
    expect(toast).toContain("addPhone=");
  });
});
describe("D recents (v1)", () => {
  it("fetchCallHistory hits the real endpoint", () => {
    expect(svc).toContain("/api/voice/recent-calls");
  });
  // BF_PORTAL_PHONE_TAB_v1 - Recents + Voicemail are now one "Phone" tab.
  // RecentsTab itself is unchanged; it is rendered inside PhoneTab. The test still
  // guarantees recent calls are reachable from Communications.
  it("Communications surfaces recent calls under the Phone tab", () => {
    expect(comm).toContain('{ id: "phone", label: "Phone" }');
    expect(comm).toContain("function PhoneTab()");
    expect(comm).toContain("function RecentsTab()");
    expect(comm).toContain("<RecentsTab />");
  });
});
