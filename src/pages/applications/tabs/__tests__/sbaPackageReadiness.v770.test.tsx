// BF_PORTAL_SBA_PACKAGE_READINESS_v770
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

const state: { data: any } = { data: {} };
vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({ data: state.data })),
    post: vi.fn(async () => ({ data: {} })),
  },
}));
import SbaSigningTab from "../SbaSigningTab";

const base = { isSba: true, formsComplete: true, missingForms: [], envelopes: [], allSigned: false };

describe("SBA Signing tab shows who the 4506-C names", () => {
  beforeEach(() => { state.data = { ...base }; });
  it("tells staff to save the lender first when none is saved", async () => {
    state.data = { ...base, selectedLenders: [], ivesFallback: false, packageBlock: { reason: "sba_signing_not_started" } };
    render(<SbaSigningTab applicationId="a1" />);
    const note = await screen.findByTestId("sba-no-lenders");
    expect(note.textContent).toContain("tick it and press Send");
    expect(note.textContent).toContain("no 4506-C is created");
  });
  it("marks each saved lender with or without IVES details", async () => {
    state.data = { ...base, selectedLenders: [
      { lenderId: "L1", name: "Todd's lending company", ives: true, offersSba: true },
      { lenderId: "L2", name: "Other", ives: false, offersSba: true },
    ], ivesFallback: false, packageBlock: { reason: "sba_signing_not_started" } };
    render(<SbaSigningTab applicationId="a1" />);
    expect((await screen.findByTestId("sba-lender-ives-L1")).textContent).toBe("4506-C included");
    expect(screen.getByTestId("sba-lender-ives-L2").textContent).toBe("No IVES details - no 4506-C");
    expect(screen.getByTestId("sba-package-block").textContent).toContain("Waiting for Send on the Lenders tab");
  });
  it("names the lender whose 4506-C is missing", async () => {
    state.data = { ...base, envelopes: [{ ownerIndex: 1, ives4506cLenderIds: ["L1"] }], selectedLenders: [{ lenderId: "L2", name: "Pathward", ives: true, offersSba: true }],
      packageBlock: { reason: "sba_4506c_missing_for_lender", detail: "Pathward" } };
    render(<SbaSigningTab applicationId="a1" />);
    expect((await screen.findByTestId("sba-package-block")).textContent).toContain("(Pathward)");
  });
});

describe("Lenders tab explains every v788 hold", () => {
  const lt = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");
  it("has a message for each reason", () => {
    for (const r of ["sba_signing_not_started:", "sba_4506c_missing_for_lender:", "sba_4506c_missing:", "sba_forms_not_signed:", "sba_check_failed:"]) expect(lt).toContain(r);
  });
  // BF_PORTAL_SBA_ONE_BUTTON_v771 - Send now starts SBA signing itself, so "saved, sign next" is gone.
  it("shows the server's detail", () => expect(lt).toContain("detail ? `${text} (${detail})` : text"));
});

describe("before BF-Server v788 is live", () => {
  it("hides the lenders card rather than claiming no lender is saved", async () => {
    state.data = { isSba: true, formsComplete: true, missingForms: [], envelopes: [], allSigned: false };
    render(<SbaSigningTab applicationId="a1" />);
    await screen.findByTestId("sba-how-to-sign");
    expect(screen.queryByTestId("sba-lenders-card")).toBeNull();
  });
});
