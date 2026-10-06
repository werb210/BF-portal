// BF_PORTAL_CALL_FAILS_VISIBLY_v752
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/dialer/sanityCheck", () => ({ preflight: vi.fn(async () => ({ ok: false, reason: "mic_permission_denied" })) }));
vi.mock("@/native/dialerLauncher", () => ({ launchNativeBorealDialer: vi.fn(async () => false) }));

describe("calling a client never fails silently", () => {
  beforeEach(() => { vi.resetModules(); });
  it("a failed check opens the dialler panel with the reason", async () => {
    const { useDialer } = await import("@/dialer/store");
    const { startOutboundPstn } = await import("@/dialer/actions");
    await startOutboundPstn("(403) 555-0111", { applicationId: "a1", contactName: "Pat" });
    const st: any = useDialer.getState();
    expect(st.isOpen).toBe(true);
    expect(st.status).toBe("error");
    expect(st.error).toBe("mic_permission_denied");
  });
  it("an undiallable number opens the panel and says so", async () => {
    const { useDialer } = await import("@/dialer/store");
    const { startOutboundPstn } = await import("@/dialer/actions");
    await startOutboundPstn("12", {});
    const st: any = useDialer.getState();
    expect(st.isOpen).toBe(true);
    expect(st.error).toBe("invalid_phone");
    expect(readFileSync("src/dialer/components/DialerPanel.tsx", "utf8")).toContain('st.error === "invalid_phone"');
  });
  it("the application card prefers the CRM contact's phone, then any stored applicant phone", async () => {
    const { pickCallPhone } = await import("../PipelinePage");
    expect(pickCallPhone({ callPhone: "+14035550199" }, { phone: "4035550111" })).toBe("+14035550199");
    expect(pickCallPhone({}, { mobile: "403-555-0111" })).toBe("403-555-0111");
    expect(pickCallPhone({ rawPayload: { readiness: { phone: "4035550122" } } }, {})).toBe("4035550122");
    expect(pickCallPhone({}, { phone: "" })).toBeNull();
  });
  it("the Mac app asks macOS for the microphone at start", () => {
    expect(readFileSync("desktop/main.cjs", "utf8")).toContain('systemPreferences.askForMediaAccess("microphone")');
  });
});
