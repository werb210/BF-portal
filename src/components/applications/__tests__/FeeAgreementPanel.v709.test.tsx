// BF_PORTAL_FEE_AGREEMENT_v709
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a) } }));
import FeeAgreementPanel, { describeFeeAgreement } from "../FeeAgreementPanel";
beforeEach(() => get.mockReset());
describe("fee agreement panel", () => {
  it("shows nothing when no agreement is owed", async () => { get.mockResolvedValueOnce({ required: false }); const { container } = render(<FeeAgreementPanel applicationId="app-1" />); await waitFor(() => expect(get).toHaveBeenCalledWith("/api/portal/applications/app-1/fee-agreement")); expect(container.querySelector("[data-testid='fee-agreement-panel']")).toBeNull(); });
  it("shows a waiting agreement with the lender that triggered it", async () => { get.mockResolvedValueOnce({ required: true, status: "pending", signerName: "Dana Reyes", signerIsApplicant: true, lenderName: "Bondit Media", sentAt: "2026-10-03T18:00:00Z" }); render(<FeeAgreementPanel applicationId="app-1" />); const el = await screen.findByTestId("fee-agreement-panel"); expect(el.textContent).toContain("Dana Reyes"); expect(el.textContent).toContain("Waiting for signature"); expect(el.textContent).not.toContain("has no broker agreement"); }); // BF_PORTAL_FEE_AGREEMENT_PANEL_FIX_v738
  it("describes a signed agreement and an emailed director", () => { expect(describeFeeAgreement({ required: true, status: "signed", signerName: "Pat Lee", signedAt: "2026-10-04T18:00:00Z" })?.text).toContain("signed by Pat Lee"); expect(describeFeeAgreement({ required: true, status: "pending", signerName: "Pat Lee", signerEmail: "pat@x.com", signerIsApplicant: false })?.text).toContain("emailed to Pat Lee (pat@x.com)"); expect(describeFeeAgreement(null)).toBeNull(); });
  it("never breaks the Lenders tab when the request fails", async () => { get.mockRejectedValueOnce(new Error("boom")); const { container } = render(<FeeAgreementPanel applicationId="app-1" />); await waitFor(() => expect(get).toHaveBeenCalled()); expect(container.innerHTML).toBe(""); });
});
