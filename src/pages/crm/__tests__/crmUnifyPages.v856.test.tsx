// BF_PORTAL_v856_CRM_UNIFY - the contact record in the shared CRM: AI summary above Stage history, the duplicates
// banner, Edit tags, and on Keystone contacts the licence card instead of Credit Readiness.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = (...a: unknown[]) => h.get(...a);
  fn.post = (...a: unknown[]) => h.post(...a);
  fn.patch = vi.fn(async () => ({}));
  fn.delete = vi.fn(async () => ({}));
  return { api: fn, default: fn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() };
});
vi.mock("@/api/crm", () => ({
  crmApi: {
    getContact: vi.fn().mockResolvedValue({
      id: "c1", name: "Kay Keystone", email: "kay@brokerage.ca", phone: "+15875550100", tags: ["Lender", "website_signup"],
      company_id: "co1", company_name: "Big Brokerage", created_at: "2026-10-23T12:00:00Z", applicationIds: [],
    }),
    timeline: vi.fn().mockResolvedValue([]),
    sharedMailboxes: vi.fn().mockResolvedValue({ mine: null, shared: [] }),
  },
}));

import ContactDetailPage from "@/pages/crm/contacts/ContactDetailPage";
import { CrmBaseProvider } from "@/pages/crm/crmBase";

function renderAt(base: string) {
  return render(
    <MemoryRouter initialEntries={[`${base}/contacts/c1`]}>
      <CrmBaseProvider base={base}>
        <Routes><Route path={`${base}/contacts/:id`} element={<ContactDetailPage />} /></Routes>
      </CrmBaseProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.get.mockReset();
  h.post.mockReset();
  h.post.mockResolvedValue({});
  h.get.mockImplementation(async (path: string) => {
    if (path === "/api/crm/unified/duplicates/contact/c1") return { count: 2, candidates: [
      { id: "c2", name: "Kay K", email: "kay@brokerage.ca", phone: null, company_name: null, created_at: null, reasons: ["Same email"] },
      { id: "c3", name: "K Keystone", email: null, phone: "+15875550100", company_name: null, created_at: null, reasons: ["Same phone"] },
    ] };
    if (path === "/api/crm/unified/contacts/c1/ks-licensee") return { stage: "signed_up", companyName: "Big Brokerage", companyCode: null, plan: "Growth", seats: 3, status: "active", demo: { openedAt: null, steps: 0, completedAt: null }, payment: { status: "Signed up - not paying yet", lastAt: null, summary: null }, lastEvent: { at: null, summary: null, type: null } };
    return {};
  });
});

describe("contact record (shared CRM)", () => {
  it("Keystone: licence card instead of Credit Readiness, and the duplicates banner", async () => {
    renderAt("/silo/ks/crm");
    await screen.findByText("Kay Keystone");
    const card = await screen.findByTestId("crm-ks-licensee");
    expect(await within(card).findByText("Growth")).toBeInTheDocument();
    const banner = await screen.findByTestId("crm-duplicates-banner");
    expect(banner).toHaveTextContent("There are 2 possible duplicates. Would you like to merge them?");
    expect(within(banner).getByRole("link", { name: "Kay K" }).getAttribute("href")).toBe("/silo/ks/crm/contacts/c2");
  });

  it("BF: no Keystone card; AI summary sits above Stage history; tags are editable", async () => {
    renderAt("/crm");
    await screen.findByText("Kay Keystone");
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/crm/unified/duplicates/contact/c1"));
    expect(screen.queryByTestId("crm-ks-licensee")).toBeNull();
    expect(h.get).not.toHaveBeenCalledWith("/api/crm/unified/contacts/c1/ks-licensee");
    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));
    const analytics = screen.getByTestId("contact-panel-analytics");
    const summary = within(analytics).getByTestId("crm-ai-summary");
    const stage = within(analytics).getByText(/stage history/i);
    expect(summary.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const editor = screen.getByTestId("crm-tag-editor");
    expect(within(editor).getAllByTestId("crm-tag-chip").map((c) => c.getAttribute("data-kind"))).toEqual(["core", "system"]);
  });
});
