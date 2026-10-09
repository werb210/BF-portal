// BF_PORTAL_SBA_SEND_FOR_SIGNING_v749 / BF_PORTAL_SBA_ONE_BUTTON_v771
// v771: the SBA Signing tab no longer has its own Send for signing / resend buttons. An SBA file signs from
// Send on the Lenders tab (and Send for signing on the Application tab), like every other file.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({ data: { isSba: true, formsComplete: true, missingForms: [], envelopes: [], allSigned: false } })),
    post: vi.fn(async () => ({ data: {} })),
  },
}));
import SbaSigningTab from "../SbaSigningTab";

describe("one way to sign an SBA file", () => {
  it("the SBA Signing tab shows status and how signing starts, with no buttons of its own", async () => {
    render(<SbaSigningTab applicationId="a1" />);
    expect((await screen.findByTestId("sba-how-to-sign")).textContent).toContain("tick the lender and press Send");
    expect(screen.queryByTestId("sba-send-for-signing")).toBeNull();
    expect(screen.queryByTestId("sba-resend")).toBeNull();
  });
  it("Lenders tab explains why Send could not start SBA signing", () => {
    const lt = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");
    expect(lt).toContain('a === "sba_forms_incomplete"');
    expect(lt).toContain("sba_signing_not_started:");
  });
  it("Application tab labels the SBA reasons", () => {
    const at = readFileSync("src/pages/applications/tabs/ApplicationTab.tsx", "utf8");
    expect(at).toContain('case "sba_forms_incomplete"');
  });
  it("a second Send on an unsigned SBA file reads as waiting, not a failure", () => {
    expect(readFileSync("src/pages/applications/tabs/signingStatus.ts", "utf8")).toContain('"sba_forms_not_signed"');
  });
});
