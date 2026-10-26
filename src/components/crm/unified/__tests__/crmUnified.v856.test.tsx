// BF_PORTAL_v856_CRM_UNIFY - the shared CRM components, in BF/SLF/KS (BF-Server) and BI (BI-Server) form.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), role: { current: "Admin" },
}));
vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = (...a: unknown[]) => h.get(...a);
  fn.post = (...a: unknown[]) => h.post(...a);
  fn.patch = (...a: unknown[]) => h.patch(...a);
  fn.delete = (...a: unknown[]) => h.del(...a);
  return { api: fn, default: fn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: h.role.current } }) }));

import { BI_CRM_BACKEND, formatPhone, normalizeTag, type CrmBackend, type TagCatalogue } from "../crmUnifiedApi";
import { CrmBulkTagActions, CrmTagChips, CrmTagEditor, CrmTagViewBy } from "../CrmTags";
import { CrmCleanupPage } from "../CrmCleanupPage";
import { CrmCompanyDetails, CrmCompanyPeople } from "../CrmCompany";
import { CrmAiSummary, CrmKsLicenseeCard } from "../CrmAiSummary";

const BF: CrmBackend = { kind: "bf", base: "/api/crm", linkBase: "/crm", contactsPath: "/api/crm/contacts" };
const catalogue: TagCatalogue = {
  core: [], custom: [{ slug: "vip", label: "VIP", kind: "custom" }], system: [],
  inUse: [
    { tag: "lender", label: "Lender", kind: "core", contacts: 3, companies: 1 },
    { tag: "application_started", label: "application_started", kind: "system", contacts: 9, companies: 0 },
  ],
};
const wrap = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  h.role.current = "Admin";
  for (const m of [h.get, h.post, h.patch, h.del]) { m.mockReset(); m.mockResolvedValue({}); }
});
afterEach(() => vi.restoreAllMocks());

describe("tags", () => {
  it("normalises like the servers and formats phones for display", () => {
    expect(normalizeTag("Contact form")).toBe("contact_form");
    expect(normalizeTag("Account/Book Keeper")).toBe("accountant");
    expect(formatPhone("+14035550123")).toBe("(403) 555-0123");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });

  it("View by: All, Untagged, the shared and silo tags with counts, automatic tags apart; any of several", () => {
    const onChange = vi.fn();
    wrap(<CrmTagViewBy backend={BF} entity="contact" value={["lender"]} onChange={onChange} catalogue={catalogue} />);
    const bar = screen.getByTestId("crm-view-by");
    for (const name of ["All", "Untagged", "Lender (3)", "Broker (0)", "Lawyer (0)", "Accountant/Bookkeeper (0)", "Referrer (0)", "Active (0)", "VIP (0)", "application_started (9)"]) {
      expect(within(bar).getByRole("button", { name })).toBeInTheDocument();
    }
    fireEvent.click(within(bar).getByRole("button", { name: "Untagged" }));
    expect(onChange).toHaveBeenLastCalledWith(["lender", "__none__"]);
    fireEvent.click(within(bar).getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(within(bar).getByRole("button", { name: "Manage tags" })).toBeInTheDocument();
  });

  it("only Admins see Manage tags", () => {
    h.role.current = "Staff";
    wrap(<CrmTagViewBy backend={BF} entity="contact" value={[]} onChange={() => {}} catalogue={catalogue} />);
    expect(screen.queryByRole("button", { name: "Manage tags" })).toBeNull();
  });

  it("bulk Tag as and Remove tag (Active included) post to the unified endpoint", async () => {
    const onDone = vi.fn();
    wrap(<CrmBulkTagActions backend={BI_CRM_BACKEND} entity="contact" ids={["c1", "c2"]} catalogue={catalogue} onDone={onDone} />);
    fireEvent.change(screen.getByTestId("crm-bulk-remove-tag"), { target: { value: "active" } });
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/v1/bi/crm/unified/tags/apply", { entity: "contact", ids: ["c1", "c2"], add: [], remove: ["active"] }));
    expect(onDone).toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("crm-bulk-tag-as"), { target: { value: "vip" } });
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/v1/bi/crm/unified/tags/apply", { entity: "contact", ids: ["c1", "c2"], add: ["vip"], remove: [] }));
  });

  it("Edit tags: staff tags can be removed, automatic tags are grey and locked", async () => {
    wrap(<CrmTagEditor backend={BF} entity="contact" id="c1" tags={["Lender", "application_started"]} catalogue={catalogue} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit tags" }));
    expect(screen.queryByRole("button", { name: "Remove tag application_started" })).toBeNull();
    const chips = screen.getAllByTestId("crm-tag-chip");
    expect(chips.map((c) => c.getAttribute("data-kind"))).toEqual(["core", "system"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove tag Lender" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/tags/apply", { entity: "contact", ids: ["c1"], add: [], remove: ["lender"] }));
  });

  it("list chips: staff tags first, automatic tags after, old free text as written", () => {
    wrap(<CrmTagChips tags={["application_started", "country:CA", "active"]} catalogue={catalogue} />);
    expect(screen.getAllByTestId("crm-tag-chip").map((c) => c.textContent)).toEqual(["country:CA", "Active", "application_started"]);
  });
});

describe("clean up data", () => {
  it("shows proposed changes; applies only the ticked ones; a batch can be undone", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path === "/api/crm/unified/cleanup/scan?entity=contact") {
        return { entity: "contact", changes: [
          { entity: "contact", entityId: "c1", record: "JOHN SMITH", field: "name", before: "JOHN SMITH", after: "John Smith", reason: "All capitals" },
          { entity: "contact", entityId: "c2", record: "Ann", field: "phone", before: "403-555-0123", after: "+14035550123", reason: "Phone format" },
        ] };
      }
      if (path === "/api/crm/unified/cleanup/batches") return [{ id: "b1", created_at: "2026-10-25T10:00:00Z", change_count: 1, undone_at: null, created_by_name: "Pat Admin" }];
      return {};
    });
    h.post.mockResolvedValue({ batchId: "b2", applied: 1, skipped: [], restored: 1 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<CrmCleanupPage backend={BF} />);
    expect(h.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    await screen.findByText("John Smith");
    fireEvent.click(screen.getByRole("checkbox", { name: "Fix Phone of Ann" }));
    fireEvent.click(screen.getByRole("button", { name: "Fix selected" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/cleanup/apply", { changes: [expect.objectContaining({ entityId: "c1", field: "name", after: "John Smith" })] }));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/cleanup/batches/b1/undo", {}));
  });
});

describe("company record", () => {
  const people = {
    groups: {
      primary: [{ key: "contact:c1", contactId: "c1", name: "Sean Dwyer", email: "pokedwyer@gmail.com", phone: "+13238982498", role: "primary_applicant", roleLabel: "Primary applicant", detail: null, source: "application", group: "primary" }],
      partners: [{ key: "email:pokecullen@gmail.com", contactId: null, name: "Elizabeth Cullen", email: "pokecullen@gmail.com", phone: "(310) 663-1364", role: "partner", roleLabel: "Partner", detail: null, source: "application", group: "partners" }],
      guarantors: [], advisors: [{ key: "email:ann@numbers.ca", contactId: null, name: "Ann Count", email: "ann@numbers.ca", phone: null, role: "accountant", roleLabel: "Accountant", detail: "Numbers LLP", source: "advisor_form", group: "advisors" }],
      other: [],
    },
    people: [], roles: {},
  };

  it("People grouped by role with links, emails and phones; Remove from company and Add person", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path === "/api/crm/unified/companies/co1/people") return people;
      if (path.startsWith("/api/crm/contacts?q=")) return [{ id: "c7", name: "Larry Law", email: "larry@law.ca" }];
      return {};
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<CrmCompanyPeople backend={BF} companyId="co1" />);
    const sean = await screen.findByRole("link", { name: "Sean Dwyer" });
    expect(sean.getAttribute("href")).toBe("/crm/contacts/c1");
    expect(screen.getByText("(323) 898-2498")).toBeInTheDocument();
    expect(screen.getByText("Elizabeth Cullen")).toBeInTheDocument();
    expect(screen.getByText(/Numbers LLP/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Elizabeth Cullen from company" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/companies/co1/people/remove", { key: "email:pokecullen@gmail.com", contactId: null, email: "pokecullen@gmail.com", name: "Elizabeth Cullen" }));

    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    const dialog = screen.getByRole("dialog", { name: "Add person" });
    fireEvent.change(within(dialog).getByLabelText("Search contacts"), { target: { value: "lar" } });
    fireEvent.click(await within(dialog).findByRole("radio"));
    fireEvent.change(within(dialog).getByLabelText("Role"), { target: { value: "lawyer" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/companies/co1/people", { contactId: "c7", role: "lawyer" }));
  });

  it("details: shows where each value came from and saves only what changed", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path === "/api/crm/unified/companies/co1/details") {
        return { tags: [], fields: [
          { key: "city", label: "City", value: "Los Angeles", source: "company", editable: true, type: "text" },
          { key: "address", label: "Address", value: "341 N Orange Dr", source: "application", editable: true, type: "text" },
          { key: "owner_id", label: "Owner", value: null, raw: null, source: null, editable: true, type: "owner" },
          { key: "created_at", label: "Created", value: "2026-10-21T00:00:00.000Z", source: "company", editable: false, type: "readonly" },
        ] };
      }
      return {};
    });
    h.patch.mockResolvedValue({ fields: [] });
    wrap(<CrmCompanyDetails backend={BF} companyId="co1" owners={[{ id: "u9", first_name: "Andrew", last_name: "P" }]} />);
    const panel = await screen.findByTestId("crm-company-details");
    expect(within(panel).getByText(/from the application/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Edit details" }));
    fireEvent.change(within(panel).getByLabelText("City"), { target: { value: "Calgary" } });
    fireEvent.change(within(panel).getByLabelText("Owner"), { target: { value: "u9" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(h.patch).toHaveBeenCalledWith("/api/crm/unified/companies/co1/details", { city: "Calgary", owner_id: "u9" }));
  });
});

describe("AI summary and Keystone card", () => {
  it("shows the saved summary with its sources and what the business does; Refresh makes a new one", async () => {
    h.get.mockResolvedValue({
      summary: "Background: film finance.\n- Next: call", business: "Allen Capital Funding arranges film finance.", generatedAt: "2026-10-25T10:00:00Z", cached: true,
      sources: [{ type: "website", label: "allencapfunding.com", url: "https://allencapfunding.com/", detail: "Domain of a work email", status: "used" }, { type: "applications", label: "Applications", detail: "2", status: "used" }],
    });
    wrap(<CrmAiSummary backend={BF} entity="contact" id="c1" />);
    expect(await screen.findByText("Allen Capital Funding arranges film finance.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "allencapfunding.com" })).toBeInTheDocument();
    expect(screen.getByText(/Applications/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/crm/unified/ai-summary/contact/c1", {}));
  });

  it("Keystone licence: plan, seats, status, demo and payment; a clear empty state", async () => {
    h.get.mockResolvedValueOnce({
      stage: "paying", companyName: "Big Brokerage", companyCode: "BIG", plan: "Growth", seats: 3, status: "active",
      demo: { openedAt: "2026-10-23T10:00:00Z", steps: 4, completedAt: null }, payment: { status: "Paying", lastAt: null, summary: null },
      lastEvent: { at: null, summary: null, type: null },
    });
    const { unmount } = wrap(<CrmKsLicenseeCard backend={BF} contactId="k1" />);
    const card = await screen.findByTestId("crm-ks-licensee");
    await within(card).findByText("Growth");
    expect(within(card).getByText("3")).toBeInTheDocument();
    expect(within(card).getAllByText("Paying").length).toBeGreaterThan(0);
    expect(within(card).getByText("4 step(s), opened 2026-10-23")).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith("/api/crm/unified/contacts/k1/ks-licensee");
    unmount();
    h.get.mockResolvedValueOnce(null);
    wrap(<CrmKsLicenseeCard backend={BF} contactId="k2" />);
    expect(await screen.findByText("No Keystone licence details yet.")).toBeInTheDocument();
  });
});
