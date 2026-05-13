// BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BIOutreach from "@/silos/bi/crm/BIOutreach";

describe("BF_PORTAL_BLOCK_v202_OUTREACH_UI_v1 — BIOutreach", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("loads contacts on mount", async () => {
    apiMock.mockResolvedValue({
      contacts: [
        {
          id: "c1",
          full_name: "Jane Doe",
          email: "jane@example.com",
          phone_e164: "+14165551234",
          title: "CFO",
          outreach_status: "cold",
          outreach_owner_id: null,
          outreach_updated_at: null,
          created_at: "2026-05-01",
        },
      ],
    });
    render(<BIOutreach />);
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
    expect(apiMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/bi/crm/outreach/contacts"),
    );
  });

  it("appends ?status= to the URL when status filter changes", async () => {
    apiMock.mockResolvedValue({ contacts: [] });
    render(<BIOutreach />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();
    const select = screen.getByLabelText(/status filter/i);
    fireEvent.change(select, { target: { value: "engaged" } });
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining("status=engaged"),
      );
    });
  });

  it("disables Send demo invite when no bookings_url is configured", async () => {
    apiMock.mockResolvedValue({
      contacts: [
        {
          id: "c1",
          full_name: "Jane Doe",
          email: null,
          phone_e164: null,
          title: null,
          outreach_status: null,
          outreach_owner_id: null,
          outreach_updated_at: null,
          created_at: "2026-05-01",
        },
      ],
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    const btn = screen.getByRole("button", { name: /send demo invite/i });
    expect(btn).toBeDisabled();
  });

  it("renders one option per allowed status", async () => {
    apiMock.mockResolvedValue({ contacts: [] });
    render(<BIOutreach />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const select = screen.getByLabelText(/status filter/i) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    // "" (All), "unassigned", + 8 canonical statuses = 10
    expect(values).toContain("cold");
    expect(values).toContain("attempting");
    expect(values).toContain("demo_booked");
    expect(values).toContain("not_interested");
    expect(values).toContain("lender");
    expect(values.length).toBe(10);
  });
});
