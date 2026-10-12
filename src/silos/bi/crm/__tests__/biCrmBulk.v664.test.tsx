// BF_PORTAL_BLOCK_v664_BI_CONTACTS_BULK - BI CRM bulk + admin delete
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn, biApi: vi.fn(), role: { current: "Admin" as string } };
});
vi.mock("@/api", () => ({
  api: h.apiFn,
  default: h.apiFn,
  apiGetEnvelope: vi.fn(),
  rawApiFetch: vi.fn(),
  apiForSilo: () => h.biApi,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: h.role.current } }) }));
vi.mock("@/silos/bi/api/biRequiredDocs", () => ({ fetchRequiredDocs: vi.fn(async () => []) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import BIContactsList from "@/silos/bi/crm/contacts/BIContactsList";
import BICompaniesList from "@/silos/bi/crm/companies/BICompaniesList";
import DocumentsTab from "@/silos/bi/pipeline/tabs/DocumentsTab";

const contacts = [
  { id: "c1", full_name: "Jane Doe", company_name: "Acme", outreach_status: null, outreach_owner_id: null, tags: null, created_at: "2026-05-01T12:00:00Z" },
  { id: "c2", full_name: "John Roe", company_name: "Beta", outreach_status: null, outreach_owner_id: null, tags: null, created_at: "2026-05-02T12:00:00Z" },
];
const companies = [
  { id: "co1", legal_name: "Acme Inc", operating_name: null, business_number: null, address_line1: null, city: null, province: null, postal_code: null, industry: null, created_at: "2026-05-01T12:00:00Z", contact_count: 1 },
  { id: "co2", legal_name: "Beta Co", operating_name: null, business_number: null, address_line1: null, city: null, province: null, postal_code: null, industry: null, created_at: "2026-05-02T12:00:00Z", contact_count: 0 },
];

beforeEach(() => {
  h.role.current = "Admin";
  for (const m of [h.apiFn, h.apiFn.get, h.apiFn.post, h.biApi]) m.mockReset();
  h.apiFn.get.mockImplementation(async (url: string) => (url === "/api/users" ? { users: [] } : []));
  h.apiFn.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/v1/bi/crm/contacts?")) return contacts;
    if (url.startsWith("/api/v1/bi/crm/companies?")) return companies;
    if (url.endsWith("/documents")) return { documents: [{ id: "d1", doc_type: "misc_extra", file_name: "extra.pdf", status: "pending" }] };
    return { ok: true };
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

function postsTo(path: string) {
  return h.apiFn.mock.calls.filter((c: any[]) => c[0] === path && c[1]?.method === "POST");
}

function rowCheckbox(testId: string, index: number) {
  const row = screen.getAllByTestId(testId)[index]!;
  return within(row).getByRole("checkbox");
}

describe("v664 BI CRM bulk + admin delete", () => {
  it("contacts list: admins tick rows, then bulk delete and bulk tag hit the bulk endpoints", async () => {
    render(<MemoryRouter><BIContactsList /></MemoryRouter>);
    await screen.findByText("Jane Doe");
    fireEvent.click(rowCheckbox("bi-contact-row", 0));
    fireEvent.click(rowCheckbox("bi-contact-row", 1));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Tag as\u2026"), { target: { value: "lender" } });
    await waitFor(() => expect(postsTo("/api/v1/bi/crm/contacts/bulk-tag")).toHaveLength(1));
    expect(postsTo("/api/v1/bi/crm/contacts/bulk-tag")[0]![1].body).toEqual({ ids: ["c1", "c2"], tag: "lender" });

    await waitFor(() => expect(screen.queryByText("2 selected")).not.toBeInTheDocument());
    fireEvent.click(rowCheckbox("bi-contact-row", 0));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(postsTo("/api/v1/bi/crm/contacts/bulk-delete")).toHaveLength(1));
    expect(postsTo("/api/v1/bi/crm/contacts/bulk-delete")[0]![1].body).toEqual({ ids: ["c1"] });
  });

  it("contacts list: non-admins get no checkboxes", async () => {
    h.role.current = "Staff";
    render(<MemoryRouter><BIContactsList /></MemoryRouter>);
    await screen.findByText("Jane Doe");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("companies list: admins tick rows, then bulk delete and bulk tag hit the bulk endpoints", async () => {
    render(<MemoryRouter><BICompaniesList /></MemoryRouter>);
    await screen.findByText("Acme Inc");
    fireEvent.click(rowCheckbox("bi-company-row", 1));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Tag name"), { target: { value: "carrier" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply tag" }));
    await waitFor(() => expect(postsTo("/api/v1/bi/crm/companies/bulk-tag")).toHaveLength(1));
    expect(postsTo("/api/v1/bi/crm/companies/bulk-tag")[0]![1].body).toEqual({ ids: ["co2"], tag: "carrier" });

    await waitFor(() => expect(screen.queryByText("1 selected")).not.toBeInTheDocument());
    fireEvent.click(rowCheckbox("bi-company-row", 0));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(postsTo("/api/v1/bi/crm/companies/bulk-delete")).toHaveLength(1));
    expect(postsTo("/api/v1/bi/crm/companies/bulk-delete")[0]![1].body).toEqual({ ids: ["co1"] });
  });

  it("companies list: non-admins get no checkboxes", async () => {
    h.role.current = "Staff";
    render(<MemoryRouter><BICompaniesList /></MemoryRouter>);
    await screen.findByText("Acme Inc");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("doc delete is admin-gated", async () => {
    const { unmount } = render(<DocumentsTab applicationId="app-1" stage="document_review" onMutated={() => {}} />);
    await screen.findByText("extra.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/v1/bi/documents/d1", { method: "DELETE" }));
    unmount();

    h.role.current = "Staff";
    render(<DocumentsTab applicationId="app-1" stage="document_review" onMutated={() => {}} />);
    await screen.findByText("extra.pdf");
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
