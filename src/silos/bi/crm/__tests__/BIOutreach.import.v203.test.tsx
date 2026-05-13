// BF_PORTAL_BLOCK_v203_OUTREACH_IMPORT_AND_INVITE_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BIOutreach from "@/silos/bi/crm/BIOutreach";

function contact(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone_e164: "+14165551234",
    title: "CFO",
    outreach_status: "cold",
    outreach_owner_id: null,
    outreach_updated_at: null,
    created_at: "2026-05-01",
    ...over,
  };
}

function profile(bookingsUrl: string | null) {
  return {
    profile: {
      staff_user_id: "staff-1",
      display_name: "Andrew",
      bookings_url: bookingsUrl,
      phone_e164: null,
    },
    exists: true,
  };
}

describe("BF_PORTAL_BLOCK_v203 — Import button", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders an Import button in the toolbar", async () => {
    apiMock.mockResolvedValue({ contacts: [] });
    render(<BIOutreach />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /import contacts/i })).toBeInTheDocument();
  });

  it("POSTs FormData to /import when a file is selected", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/bi/crm/outreach/contacts")) return { contacts: [] };
      if (path.includes("/import"))
        return { imported: 2, skipped: 0, total: 2, results: [] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());

    const input = screen.getByTestId("bi-outreach-file-input") as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "list.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        "/api/v1/bi/crm/outreach/import",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });
    expect(await screen.findByTestId("bi-outreach-import-banner")).toBeInTheDocument();
    expect(screen.getByText(/Imported/)).toBeInTheDocument();
  });

  it("surfaces error from import endpoint", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/bi/crm/outreach/contacts")) return { contacts: [] };
      if (path.includes("/import")) throw new Error("parse_failed");
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const input = screen.getByTestId("bi-outreach-file-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(1)], "bad.csv")] },
    });
    await waitFor(() => {
      expect(screen.getByText(/Import failed: parse_failed/)).toBeInTheDocument();
    });
  });
});

describe("BF_PORTAL_BLOCK_v203 — Send demo invite", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders disabled when staff has no bookings_url", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/me/profile")) return profile(null);
      if (path.startsWith("/api/v1/bi/crm/outreach/contacts")) return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    // Open profile panel so profile loads, then close.
    fireEvent.click(screen.getByRole("button", { name: /my profile/i }));
    await waitFor(() => screen.getByText("Jane Doe"));
    const btn = screen.getByRole("button", { name: /send demo invite/i });
    expect(btn).toBeDisabled();
  });

  it("renders disabled when contact has no phone", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/me/profile"))
        return profile("https://outlook.office.com/bookings/x");
      if (path.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact({ phone_e164: null })] };
      return {};
    });
    render(<BIOutreach />);
    fireEvent.click(screen.getByRole("button", { name: /my profile/i }));
    await waitFor(() => screen.getByText("Jane Doe"));
    const btn = screen.getByRole("button", { name: /send demo invite/i });
    expect(btn).toBeDisabled();
  });

  it("POSTs to /demo-invite when clicked and confirmed", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/me/profile"))
        return profile("https://outlook.office.com/bookings/x");
      if (path.startsWith("/api/v1/bi/crm/outreach/contacts") && !path.includes("/demo-invite") && !path.includes("/activity"))
        return { contacts: [contact()] };
      if (path.endsWith("/demo-invite"))
        return { ok: true, sid: "SM123" };
      return {};
    });
    render(<BIOutreach />);
    fireEvent.click(screen.getByRole("button", { name: /my profile/i }));
    await waitFor(() => screen.getByText("Jane Doe"));

    // Click expand
    fireEvent.click(screen.getByRole("button", { name: /send demo invite/i }));
    // Now the inline Send button appears
    const sendBtn = await screen.findByRole("button", { name: /^send$/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/contacts\/c1\/demo-invite$/),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
