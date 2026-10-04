// BF_PORTAL_FEE_AGREEMENT_PANEL_FIX_v738
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: any[]) => get(...a), post: vi.fn() } }));
import FeeAgreementPanel from "../FeeAgreementPanel";
describe("fee agreement panel", () => {
  it("the send button looks like a button (filled navy)", async () => {
    get.mockResolvedValue({ required: false });
    render(<FeeAgreementPanel applicationId="a" productCategory="Media" />);
    const b = await screen.findByText("Send fee agreement to client");
    expect((b as HTMLElement).style.background).toContain("rgb(11, 31, 58)");
  });
  it("a waiting agreement no longer says a lender has no broker agreement", async () => {
    get.mockResolvedValue({ required: true, status: "pending", signerName: "Test", signerIsApplicant: true, lenderName: "Todd's Lending company" });
    render(<FeeAgreementPanel applicationId="a" productCategory="Media" />);
    const el = await screen.findByTestId("fee-agreement-panel");
    expect(el.textContent).not.toContain("broker agreement");
    expect(el.textContent).toContain("Waiting for signature");
  });
});
