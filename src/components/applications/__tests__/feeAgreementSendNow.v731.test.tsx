// BF_PORTAL_FEE_AGREEMENT_SEND_NOW_v731
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const get = vi.fn(); const post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
import FeeAgreementPanel from "../FeeAgreementPanel";
beforeEach(() => { get.mockReset(); post.mockReset(); post.mockResolvedValue({ ok: true }); });
describe("send the fee agreement by hand", () => {
  it("offers the button on a Media file with no agreement, and sends it", async () => {
    get.mockResolvedValue({ required: false });
    render(<FeeAgreementPanel applicationId="app-1" productCategory="Media" />);
    fireEvent.click(await screen.findByText("Send fee agreement to client"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/portal/applications/app-1/fee-agreement/send", { lenderName: undefined }));
  });
  it("no button on non-Media files", async () => {
    get.mockResolvedValue({ required: false });
    const { container } = render(<FeeAgreementPanel applicationId="app-1" productCategory="LOC" />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
  it("can send again while waiting", async () => {
    get.mockResolvedValue({ required: true, status: "pending", signerName: "Dana", signerIsApplicant: true });
    render(<FeeAgreementPanel applicationId="app-1" productCategory="Media" />);
    fireEvent.click(await screen.findByText("Send again"));
    await waitFor(() => expect(post).toHaveBeenCalled());
  });
});
