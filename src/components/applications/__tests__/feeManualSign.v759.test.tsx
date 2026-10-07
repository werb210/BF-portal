// BF_PORTAL_FEE_MANUAL_SIGN_v759
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const get = vi.fn(), post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
import FeeAgreementPanel, { describeFeeAgreement, feeTerms } from "../FeeAgreementPanel";

beforeEach(() => { get.mockReset(); post.mockReset(); post.mockResolvedValue({ ok: true }); });

describe("marking a fee agreement signed outside the portal", () => {
  it("sends the date, the negotiated fee and the note", async () => {
    get.mockResolvedValue({ required: true, status: "pending", signerName: "Dylan Pearce", signerIsApplicant: true, sentAt: "2026-10-05T20:59:00Z" });
    render(<FeeAgreementPanel applicationId="app1" productCategory="MEDIA" />);
    fireEvent.click(await screen.findByTestId("fee-mark-signed-open"));
    fireEvent.click(screen.getByLabelText("Different percent"));
    fireEvent.change(screen.getByLabelText("Agreed percent"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("Signed on"), { target: { value: "2026-10-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark as signed" }));
    expect(await screen.findByRole("alert")).toBeTruthy(); // note is required
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Version 3 signed by email" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark as signed" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/portal/applications/app1/fee-agreement/mark-signed", { note: "Version 3 signed by email", signedOn: "2026-10-06", feePercent: 1.5, feeAmount: null }));
  });
  it("is also offered on a Media file that never had an agreement", async () => {
    get.mockResolvedValue({ required: false });
    render(<FeeAgreementPanel applicationId="app2" productCategory="MEDIA" />);
    expect(await screen.findByTestId("fee-mark-signed-open")).toBeTruthy();
  });
  it("says who marked it, with the terms and note, and offers Undo", async () => {
    const a = { required: true, status: "signed", signerName: "Dylan Pearce", signedAt: "2026-10-06T18:00:00Z", signedManually: true, manualSignedByName: "Todd Werboweski", manualNote: "Version 3", feeAmount: 25000, feePercent: null };
    expect(describeFeeAgreement(a)!.text).toContain("$25,000 fixed fee");
    expect(describeFeeAgreement(a)!.text).toContain("Marked signed by Todd Werboweski. Note: Version 3");
    expect(feeTerms({ feePercent: 1.5, feeAmount: null })).toBe("1.5% on funding");
    get.mockResolvedValue(a);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<FeeAgreementPanel applicationId="app3" productCategory="MEDIA" />);
    fireEvent.click(await screen.findByTestId("fee-unmark"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/portal/applications/app3/fee-agreement/unmark-signed", {}));
  });
});
