// BF_PORTAL_CRM_COLUMNS_MATCH_v1 - the Insurance contact list has the Financial list's columns, and every header sorts.
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiMock = vi.hoisted(() => { const fn = vi.fn() as any; fn.get = vi.fn(); return fn; });
vi.mock("@/api", () => ({ api: apiMock, apiGetEnvelope: apiMock }));
import BIContactsList from "@/silos/bi/crm/contacts/BIContactsList";

const row = (over: Record<string, unknown>) => ({ id: "c1", full_name: "Sample One", email: "one@example.com", company_name: "Sample Co", outreach_status: "new", outreach_owner_id: null, tags: [], marketing_contact: true, created_at: "2026-05-01T12:00:00Z", ...over });

describe("Insurance contact list columns", () => {
  beforeEach(() => {
    try { sessionStorage.clear(); } catch { /* jsdom */ }
    apiMock.mockReset(); apiMock.get.mockReset();
    apiMock.get.mockResolvedValue({ users: [] });
    apiMock.mockImplementation(async (url: string) => (String(url).includes("/crm/contacts") ? [row({}), row({ id: "c2", full_name: "Sample Two", marketing_contact: false })] : { tags: [] }));
  });

  it("shows the same columns as the Financial list, in the same order, with Marketing Yes/No", async () => {
    render(<MemoryRouter><BIContactsList /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByTestId("bi-contact-row")).toHaveLength(2));
    const heads = screen.getAllByRole("columnheader").map((th) => th.textContent?.replace(/[↑↓]/g, "").trim()).filter(Boolean);
    expect(heads).toEqual(["Name", "Company", "Tags", "Lead status", "Owner", "Marketing", "Create date"]);
    expect(screen.getAllByTestId("marketing-cell").map((c) => c.textContent)).toEqual(["Yes", "No"]);
  });

  it("sorts by Tags and by Marketing when their headers are clicked", async () => {
    render(<MemoryRouter><BIContactsList /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByTestId("bi-contact-row")).toHaveLength(2));
    fireEvent.click(screen.getByRole("columnheader", { name: /^Tags/ }));
    await waitFor(() => expect(apiMock.mock.calls.some((c: unknown[]) => String(c[0]).includes("sort=tags%3Aasc") || String(c[0]).includes("sort=tags:asc"))).toBe(true));
    fireEvent.click(screen.getByRole("columnheader", { name: /^Marketing/ }));
    await waitFor(() => expect(apiMock.mock.calls.some((c: unknown[]) => /sort=marketing_contact(%3A|:)asc/.test(String(c[0])))).toBe(true));
  });
});
