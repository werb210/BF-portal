// BF_PORTAL_CUSTOMER_MATCH_LISTS_v711
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

import CustomerMatchPanel, { sourceLabel } from "../CustomerMatchPanel";

const rows = [
  { contact_id: "a", name: "Ann Lee", email: "ann@x.com", phone: null, applied_at: "2026-09-01T00:00:00Z", consented: true, bf: true, cbf: false, sent_at: null },
  { contact_id: "b", name: "Bob Ray", email: null, phone: "+14035550101", applied_at: "2025-01-01T00:00:00Z", consented: false, bf: false, cbf: true, sent_at: "2026-09-02T00:00:00Z" },
];

beforeEach(() => {
  get.mockReset(); post.mockReset();
  get.mockImplementation(async (url: string) => url.includes("status")
    ? { lists: [{ kind: "applicants", name: "Boreal Financial - Applicants (CRM)", listId: "1", members: 1 }, { kind: "funded", name: "Boreal Financial - Funded clients (CRM)", listId: null, members: 0 }] }
    : { configured: true, rows });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Customer Match panel", () => {
  it("lists applicants not yet sent, with source and consent", async () => {
    render(<CustomerMatchPanel />);
    expect(await screen.findByText("Ann Lee")).toBeTruthy();
    expect(screen.queryByText("Bob Ray")).toBeNull();
    expect(screen.getByTestId("cm-list-funded").textContent).toContain("Created on first send");
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "all" } });
    expect(await screen.findByText("Bob Ray")).toBeTruthy();
  });

  it("sends only the ticked people", async () => {
    post.mockResolvedValue({ sent: 1, failed: 0, skipped: 0 });
    render(<CustomerMatchPanel />);
    fireEvent.click(await screen.findByLabelText("Select Ann Lee"));
    fireEvent.click(screen.getByTestId("cm-send"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/marketing/customer-match/applicants/send", { contactIds: ["a"] }));
    expect(await screen.findByText(/Sent 1/)).toBeTruthy();
  });

  it("labels where someone applied", () => {
    expect(sourceLabel({ bf: true, cbf: true })).toBe("BF + CBF");
    expect(sourceLabel({ bf: false, cbf: true })).toBe("CBF");
  });
});
