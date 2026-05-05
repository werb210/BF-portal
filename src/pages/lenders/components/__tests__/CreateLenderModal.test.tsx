import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";

vi.mock("@/api", () => ({
  api: {
    post: vi.fn(async () => ({ id: "lender-new-1" })),
  },
}));
vi.mock("@/components/ui/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));
vi.mock("@/components/ui/Button", () => ({
  default: (p: any) => <button {...p}>{p.children}</button>,
}));
vi.mock("@/components/ui/Select", () => ({
  default: (p: any) => (
    <select data-testid="submission-method" value={p.value} onChange={p.onChange}>
      {(p.options ?? []).map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));
vi.mock("@/utils/errors", () => ({ getErrorMessage: (_e: unknown, fallback: string) => fallback }));

import CreateLenderModal from "../CreateLenderModal";
import { api } from "@/api";

beforeEach(() => {
  (api.post as any).mockClear();
});

describe("CreateLenderModal", () => {
  it("does not render when closed", () => {
    const { container } = render(<CreateLenderModal open={false} onClose={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("shows email submission_email field by default", () => {
    render(<CreateLenderModal open onClose={() => {}} />);
    expect(screen.getByTestId("submission-email")).toBeTruthy();
  });

  it("toggles to api fields when method=api", () => {
    render(<CreateLenderModal open onClose={() => {}} />);
    fireEvent.change(screen.getByTestId("submission-method"), { target: { value: "api" } });
    expect(screen.getByTestId("api-endpoint")).toBeTruthy();
    expect(screen.getByTestId("api-key")).toBeTruthy();
  });

  it("toggles to google_sheet field when method=google_sheet", () => {
    render(<CreateLenderModal open onClose={() => {}} />);
    fireEvent.change(screen.getByTestId("submission-method"), { target: { value: "google_sheet" } });
    expect(screen.getByTestId("google-sheet-id")).toBeTruthy();
  });

  it("validates required fields and does not submit if missing", async () => {
    render(<CreateLenderModal open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("create-lender-submit"));
    await waitFor(() => {
      expect((api.post as any).mock.calls.length).toBe(0);
    });
  });

  it("submits a complete email-method payload", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreateLenderModal open onClose={onClose} onCreated={onCreated} />);
    fireEvent.change(screen.getByTestId("lender-name"), { target: { value: "ABC Bank" } });
    fireEvent.change(screen.getByTestId("lender-street"), { target: { value: "123 Main" } });
    fireEvent.change(screen.getByTestId("lender-citystatezip"), { target: { value: "Toronto, ON, M1N 2P3" } });
    fireEvent.change(screen.getByTestId("lender-mainphone"), { target: { value: "(416) 555-1234" } });
    fireEvent.change(screen.getByTestId("contact-name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByTestId("contact-phone"), { target: { value: "(416) 555-9999" } });
    fireEvent.change(screen.getByTestId("contact-email"), { target: { value: "jane@abc.com" } });
    fireEvent.change(screen.getByTestId("submission-email"), { target: { value: "submit@abc.com" } });

    fireEvent.click(screen.getByTestId("create-lender-submit"));
    await waitFor(() => expect((api.post as any).mock.calls.length).toBe(1));
    const [path, body] = (api.post as any).mock.calls[0];
    // BF_PORTAL_BLOCK_v150_CREATELENDER_TEST_FIX_v1 — v148 corrected the
    // POST URL from /api/lenders (no handler, 404s) to /api/portal/lenders
    // (real endpoint). Update the assertion to match.
    expect(path).toBe("/api/portal/lenders");
    expect(body).toEqual(expect.objectContaining({
      name: "ABC Bank",
      submission_method: "email",
      submission_email: "submit@abc.com",
    }));
    expect(onCreated).toHaveBeenCalledWith("lender-new-1");
    expect(onClose).toHaveBeenCalled();
  });
});
