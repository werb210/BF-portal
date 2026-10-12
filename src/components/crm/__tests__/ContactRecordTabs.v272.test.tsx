// BF_PORTAL_CONTACT_RECORD_TABS_v272
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// BF_PORTAL_v789_SOURCE_GREP - the wiring checks below used to read both pages' source text; they now
// render the pages and check which endpoints each tab actually calls.
const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/crm", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/api/crm")>();
  return {
    ...real,
    crmApi: {
      ...real.crmApi,
      getContact: vi.fn(async () => ({ id: "c1", name: "Jane Doe", email: "jane@example.com", phone: "+14165551234", role: "applicant" })),
      timeline: vi.fn(async () => []),
    },
  };
});

import ContactDetailPage from "@/pages/crm/contacts/ContactDetailPage";
import BIContactDetailPage from "@/silos/bi/crm/contacts/BIContactDetailPage";
import ContactRecordTabs, { CONTACT_TAB_KEY, initialContactTab } from "../ContactRecordTabs";
describe("contact record tabs", () => {
  beforeEach(() => sessionStorage.clear());
  it("opens on Timeline, switches to Analytics, and keeps both mounted", () => {
    render(<ContactRecordTabs analytics={<div>Stage history panel</div>} timeline={<div>All activity panel</div>} />);
    expect(screen.getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("contact-panel-analytics").hidden).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    expect(screen.getByTestId("contact-panel-analytics").hidden).toBe(false);
    expect(screen.getByTestId("contact-panel-timeline").hidden).toBe(true);
    expect(screen.getByText("All activity panel")).toBeTruthy();
    expect(sessionStorage.getItem(CONTACT_TAB_KEY)).toBe("analytics");
  });
  it("remembers the last tab for the session", () => {
    expect(initialContactTab(() => "analytics")).toBe("analytics");
    expect(initialContactTab(() => null)).toBe("timeline");
    expect(initialContactTab(() => { throw new Error("blocked"); })).toBe("timeline");
  });
});
describe("wiring in both silos", () => {
  beforeEach(() => {
    sessionStorage.clear();
    h.apiFn.mockReset();
    h.apiFn.get.mockReset();
    h.apiFn.post.mockReset();
    h.apiFn.get.mockResolvedValue({});
    h.apiFn.post.mockResolvedValue({});
  });
  const gets = () => h.apiFn.get.mock.calls.map((c: unknown[]) => String(c[0]));

  it("BF: analytics has stage history, AI summary and journey; timeline has all activity", async () => {
    h.apiFn.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={["/crm/contacts/c1"]}>
        <Routes><Route path="/crm/contacts/:id" element={<ContactDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Jane Doe");
    await waitFor(() => {
      expect(gets()).toContain("/api/crm/contacts/c1/stage-events");
      expect(gets()).toContain("/api/crm/contacts/c1/journey");
    });
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    const analytics = screen.getByTestId("contact-panel-analytics");
    fireEvent.click(within(analytics).getAllByRole("button").find((b) => /summar/i.test(b.textContent ?? ""))!);
    await waitFor(() => expect(gets()).toContain("/api/crm/contacts/c1/ai-summary"));
    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    expect(within(screen.getByTestId("contact-panel-timeline")).getByRole("button", { name: "All activities" })).toBeInTheDocument();
  });

  it("BI: analytics reads BI-Server, timeline keeps the activity feed, emails, calls and notes", async () => {
    h.apiFn.mockImplementation(async (path: string) => {
      if (path === "/api/v1/bi/crm/contacts/c1") {
        return { id: "c1", full_name: "Jane Doe", email: null, phone_e164: null, title: null, tags: [], notes: "Met at conference.", outreach_status: null, created_at: "2026-05-01T12:00:00Z", updated_at: "2026-05-01T12:00:00Z" };
      }
      if (path.endsWith("/activity")) return { events: [{ id: "e1", event_type: "call", body: "Spoke about limits", created_at: "2026-05-02T10:00:00Z" }] };
      return {};
    });
    render(
      <MemoryRouter initialEntries={["/silo/bi/crm/contacts/c1"]}>
        <Routes><Route path="/silo/bi/crm/contacts/:id" element={<BIContactDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Jane Doe");
    await waitFor(() => {
      expect(gets()).toContain("/api/v1/bi/crm/contacts/c1/stage-events");
      expect(gets()).toContain("/api/v1/bi/crm/contacts/c1/journey");
    });
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    const analytics = screen.getByTestId("contact-panel-analytics");
    expect(within(analytics).getByText(/boreal\.insure/i)).toBeInTheDocument(); // v570 journey site
    fireEvent.click(within(analytics).getAllByRole("button").find((b) => /summar/i.test(b.textContent ?? ""))!);
    await waitFor(() => expect(gets()).toContain("/api/v1/bi/crm/contacts/c1/ai-summary"));

    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    const timeline = screen.getByTestId("contact-panel-timeline");
    expect(within(timeline).getByTestId("bi-contact-comms-feed")).toBeInTheDocument();
    expect(within(timeline).getByTestId("bi-contact-timeline")).toBeInTheDocument();
    expect(within(timeline).getByText("Met at conference.")).toBeInTheDocument();
    expect(within(timeline).getAllByText("Spoke about limits").length).toBeGreaterThan(0);
  });
});
