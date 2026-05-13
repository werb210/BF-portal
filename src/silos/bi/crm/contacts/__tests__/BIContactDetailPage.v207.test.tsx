// BF_PORTAL_BLOCK_v207_BI_CONTACT_DETAIL_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BIContactDetailPage from "@/silos/bi/crm/contacts/BIContactDetailPage";

function contactFixture(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone_e164: "+14165551234",
    title: "CFO",
    tags: ["warm", "q3"],
    notes: "Met at conference.",
    outreach_status: "engaged",
    outreach_owner_id: "staff-1",
    outreach_updated_at: "2026-05-10T12:00:00Z",
    company_id: "co-1",
    company_name: "Acme Inc",
    company_operating_name: "Acme",
    created_at: "2026-05-01T12:00:00Z",
    updated_at: "2026-05-10T12:00:00Z",
    activity_count: 4,
    ...over,
  };
}

function renderAtId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/silo/bi/crm/contacts/${id}`]}>
      <Routes>
        <Route path="/silo/bi/crm/contacts/:id" element={<BIContactDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v207 — BIContactDetailPage", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders the contact name, status badge, and field block", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture();
    });
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    expect(screen.getByText("Engaged")).toBeInTheDocument();
    expect(screen.getByText("CFO")).toBeInTheDocument();
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
    // Field block:
    expect(screen.getByText("+14165551234")).toBeInTheDocument();
    expect(screen.getByText("staff-1")).toBeInTheDocument();
  });

  it("renders the activity timeline with badge count", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity"))
        return {
          events: [
            {
              id: "e1",
              contact_id: "c1",
              actor_id: "staff-1",
              actor_name: "Andrew",
              event_type: "call",
              outcome: "spoke",
              body: "Demo booked for next week",
              created_at: "2026-05-09T10:00:00Z",
            },
          ],
        };
      return contactFixture();
    });
    renderAtId("c1");
    await waitFor(() => {
      expect(screen.getAllByTestId("bi-contact-timeline-row")).toHaveLength(1);
    });
    expect(screen.getByText("CALL")).toBeInTheDocument();
    expect(screen.getByText(/Demo booked for next week/)).toBeInTheDocument();
    // activity_count badge
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows empty-state when there are no events", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture();
    });
    renderAtId("c1");
    await waitFor(() => {
      expect(screen.getByText(/No activity logged yet/)).toBeInTheDocument();
    });
  });

  it("renders the company link when company_id is set", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture();
    });
    renderAtId("c1");
    const link = (await screen.findByTestId("bi-contact-company-link")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/silo/bi/crm/companies/co-1");
    expect(link.textContent).toBe("Acme Inc");
  });

  it("shows 'No associated company' when company_id is null", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture({ company_id: null, company_name: null });
    });
    renderAtId("c1");
    await waitFor(() => {
      expect(screen.getByText(/No associated company/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("bi-contact-company-link")).toBeNull();
  });

  it("renders the Notes panel only when notes is non-empty", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture({ notes: null });
    });
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    expect(screen.queryByText(/^Notes$/)).toBeNull();
  });

  it("shows tag chips when tags are present", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture();
    });
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    expect(screen.getByText("warm")).toBeInTheDocument();
    expect(screen.getByText("q3")).toBeInTheDocument();
  });

  it("renders the back link to /silo/bi/crm", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = args.find((a): a is string => typeof a === "string") ?? "";
      if (path.endsWith("/activity")) return { events: [] };
      return contactFixture();
    });
    renderAtId("c1");
    const back = (await screen.findByText(/Back to contacts/)) as HTMLAnchorElement;
    expect(back.getAttribute("href")).toBe("/silo/bi/crm");
  });

  it("surfaces API error when contact fetch fails", async () => {
    apiMock.mockRejectedValueOnce(new Error("404 not_found"));
    renderAtId("c1");
    await waitFor(() => {
      expect(screen.getByText(/404 not_found/)).toBeInTheDocument();
    });
  });
});
