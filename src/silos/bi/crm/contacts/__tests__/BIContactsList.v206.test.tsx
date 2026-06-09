// BF_PORTAL_BLOCK_v206_BI_CONTACTS_LIST_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiMock = vi.hoisted(() => {
  const fn = vi.fn() as any;
  fn.get = vi.fn();
  return fn;
});
vi.mock("@/api", () => ({
  api: apiMock,
}));

import BIContactsList from "@/silos/bi/crm/contacts/BIContactsList";

function rowFixture(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone_e164: "+14165551234",
    title: "CFO",
    company_id: "co-1",
    company_name: "Acme Inc",
    outreach_status: "engaged",
    outreach_owner_id: "staff-1",
    outreach_updated_at: null,
    created_at: "2026-05-01T12:00:00Z",
    ...over,
  };
}

function renderList() {
  return render(
    <MemoryRouter>
      <BIContactsList />
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v206 — BIContactsList", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue({ users: [{ id: "staff-1", first_name: "Jane", last_name: "Owner" }] });
  });

  it("loads contacts on mount and renders one row per record", async () => {
    apiMock.mockResolvedValueOnce({ tags: [] }); // BF_PORTAL_BLOCK_v757 — tag-list fires first
    apiMock.mockResolvedValueOnce([rowFixture(), rowFixture({ id: "c2", full_name: "Bob Lee", company_name: null })]);
    renderList();
    await waitFor(() => {
      expect(screen.getAllByTestId("bi-contact-row")).toHaveLength(2);
    });
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0); // null company shows em-dash
  });

  it("includes ?sort=created_at:desc on first fetch", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=created_at%3Adesc"),
      );
    });
  });

  it("re-fetches with new sort when a header is clicked", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();
    fireEvent.click(screen.getByText(/^Name/));
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=name%3Aasc"),
      );
    });
  });

  it("toggles sort direction on the same header click", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    // first click → asc
    fireEvent.click(screen.getByText(/^Name/));
    await waitFor(() =>
      expect(apiMock).toHaveBeenLastCalledWith(
        expect.stringContaining("sort=name%3Aasc"),
      ),
    );
    // second click → desc
    fireEvent.click(screen.getByText(/^Name/));
    await waitFor(() =>
      expect(apiMock).toHaveBeenLastCalledWith(
        expect.stringContaining("sort=name%3Adesc"),
      ),
    );
  });

  it("appends q= when the search box changes", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();
    fireEvent.change(screen.getByLabelText(/search contacts/i), {
      target: { value: "acme" },
    });
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("q=acme"));
    });
  });

  it("row name is a link to /silo/bi/crm/contacts/:id", async () => {
    apiMock.mockResolvedValue([rowFixture({ id: "abc-123" })]);
    renderList();
    const link = (await screen.findByText("Jane Doe")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/silo/bi/crm/contacts/abc-123");
  });

  it("renders empty-state when API returns []", async () => {
    apiMock.mockResolvedValueOnce([]);
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/No BI contacts/i)).toBeInTheDocument();
    });
  });

  it("surfaces API error in the table body", async () => {
    apiMock.mockResolvedValueOnce({ tags: [] }); // BF_PORTAL_BLOCK_v757 — tag-list fires first
    apiMock.mockRejectedValueOnce(new Error("upstream_5xx"));
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/upstream_5xx/)).toBeInTheDocument();
    });
  });

  it("displays outreach_status with underscores replaced by spaces", async () => {
    apiMock.mockResolvedValueOnce({ tags: [] }); // BF_PORTAL_BLOCK_v757 — tag-list fires first
    apiMock.mockResolvedValueOnce([rowFixture({ outreach_status: "demo_booked" })]);
    renderList();
    await waitFor(() => {
      expect(screen.getByText("demo booked")).toBeInTheDocument();
    });
  });

  it("renders owner names from /api/users and filters by owner_id", async () => {
    apiMock.mockResolvedValueOnce({ tags: [] });
    apiMock.mockResolvedValueOnce([rowFixture()]);

    renderList();

    expect(await screen.findAllByText("Jane Owner")).toHaveLength(2);
    expect(apiMock.get).toHaveBeenCalledWith("/api/users");

    apiMock.mockClear();
    fireEvent.change(screen.getByTestId("bi-owner-filter"), {
      target: { value: "staff-1" },
    });

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("owner_id=staff-1"));
    });
  });
});
