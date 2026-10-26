// BF_PORTAL_v856_CRM_UNIFY - the second round: the contact panel (applications, partners, advisors), the role badge,
// a merged record pointing at its survivor, placeholders kept out of the "keep" choice, and the placeholder merge.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => {
  const fn: any = vi.fn(async () => ({}));
  fn.get = (...a: unknown[]) => h.get(...a);
  fn.post = (...a: unknown[]) => h.post(...a);
  fn.patch = vi.fn(async () => ({}));
  fn.delete = vi.fn(async () => ({}));
  return { api: fn, default: fn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));

import { BI_CRM_BACKEND, normalizeTag, type CrmBackend } from "../crmUnifiedApi";
import { CrmContactApplications, contactRoleBadge } from "../CrmContactPanel";
import { CrmDuplicatesBanner, CrmDuplicatesPage, CrmMergeDialog } from "../CrmDuplicates";

const BF: CrmBackend = { kind: "bf", base: "/api/crm", linkBase: "/crm", contactsPath: "/api/crm/contacts" };
const wrap = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  for (const m of [h.get, h.post]) { m.mockReset(); m.mockResolvedValue({}); }
});
afterEach(() => vi.restoreAllMocks());

describe("contact panel", () => {
  it("shows the submitted application with amount, product, stage, date, partners, a link and the advisors", async () => {
    h.get.mockImplementation(async (path: string) => {
      if (path.endsWith("/applications")) return {
        drafts: 6,
        applications: [{
          id: "app-1", business: "Poke Prod LLC", amount: 100000, product: "Media", stage: "in_review", submitted: true,
          submittedAt: "2026-10-21T12:00:00.000Z", createdAt: null, role: "applicant", link: "/applications/app-1",
          partners: [{ contactId: "eliz", name: "Elizabeth Cullen", role: "partner", email: "pokecullen@gmail.com", phone: "+13106631364" }],
        }],
      };
      if (path.endsWith("/related")) return [{ contactId: "ann", name: "Ann Count", email: null, phone: null, company: "Numbers LLP", detail: "Accountant (CPA)", direction: "advisor" }];
      return {};
    });
    wrap(<CrmContactApplications backend={BF} contactId="sean" />);
    const link = await screen.findByRole("link", { name: "Poke Prod LLC" });
    expect(link).toHaveAttribute("href", "/applications/app-1");
    expect(screen.getByText("$100,000")).toBeInTheDocument();
    expect(screen.getByText("In Review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elizabeth Cullen" })).toHaveAttribute("href", "/crm/contacts/eliz");
    expect(screen.getByText("6 unfinished drafts not shown.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ann Count" })).toHaveAttribute("href", "/crm/contacts/ann");
    expect(h.get).toHaveBeenCalledWith("/api/crm/unified/contacts/sean/applications");
  });

  it("uses BI-Server for BI contacts", async () => {
    h.get.mockResolvedValue({ applications: [], drafts: 0 });
    wrap(<CrmContactApplications backend={BI_CRM_BACKEND} contactId="b1" />);
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/v1/bi/crm/unified/contacts/b1/applications"));
  });

  it("the badge says what the person is instead of Unknown", () => {
    expect(contactRoleBadge({ role: "unknown", applicationIds: ["a"] }).label).toBe("Applicant");
    expect(contactRoleBadge({ role: "unknown", tags: ["partner"] }).label).toBe("Partner");
    expect(contactRoleBadge({ role: "unknown", tags: ["lawyer"] }).label).toBe("Advisor");
    expect(contactRoleBadge({ role: "unknown", lead_status: "New" })).toEqual({ label: "New", tip: expect.stringContaining("Lead status") });
    expect(contactRoleBadge({ role: "unknown" }).label).toBe("Contact");
    expect(normalizeTag("A/R Credit Insurance/advisor")).toBe("ar_credit_insurance");
  });
});

describe("merges", () => {
  it("a merged record says where the surviving record is instead of offering merges", async () => {
    h.get.mockResolvedValue({ count: 0, candidates: [], mergedInto: "w2", mergedIntoName: "Walter De Kruyff" });
    wrap(<CrmDuplicatesBanner backend={BF} entity="contact" id="w1" />);
    expect(await screen.findByText(/was merged into Walter De Kruyff/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the surviving record" })).toHaveAttribute("href", "/crm/contacts/w2");
    expect(screen.queryByRole("button", { name: "Review and merge" })).toBeNull();
  });

  it("keeps the real record, not the placeholder, and follows the survivor the server reports", async () => {
    h.get.mockResolvedValue({
      records: [{ id: "ph", title: "Unknown (application started)", tags: [], created_at: null, application_count: 2 }, { id: "real", title: "Sean Dwyer", tags: [], created_at: null, application_count: 0 }],
      fields: [{ key: "name", label: "Name", values: [{ id: "ph", value: "Unknown (application started)", display: "Unknown (application started)" }, { id: "real", value: "Sean Dwyer", display: "Sean Dwyer" }] }],
    });
    h.post.mockResolvedValue({ survivorId: "real" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onMerged = vi.fn();
    wrap(<CrmMergeDialog backend={BF} entity="contact" ids={["ph", "real"]} preferredId="ph" onClose={() => undefined} onMerged={onMerged} />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Keep: Sean Dwyer" })).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith("real"));
    expect(h.post).toHaveBeenCalledWith("/api/crm/unified/merge/contact", expect.objectContaining({ survivorId: "real", loserIds: ["ph"] }));
  });

  it("Find duplicates merges the placeholder copies after a dry run and a confirm", async () => {
    h.get.mockResolvedValue({ entity: "contact", groups: [{ ids: ["ph", "real"], survivorId: "real", placeholders: 1, reasons: ["Same phone"], records: [{ id: "ph", name: "Unknown (application started)" }, { id: "real", name: "Sean Dwyer" }] }] });
    h.post.mockImplementation(async (_path: string, body: any) => (body?.dryRun ? { groups: 1, contacts: 1, plan: [] } : { groups: 1, merged: 1, failed: [] }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<CrmDuplicatesPage backend={BF} />);
    expect(await screen.findByText("suggested to keep")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("crm-merge-placeholders"));
    expect(await screen.findByText("Merged 1 placeholder copy.")).toBeInTheDocument();
    expect(confirm).toHaveBeenCalled();
    expect(h.post).toHaveBeenNthCalledWith(1, "/api/crm/unified/duplicates/merge-placeholders", { dryRun: true });
    expect(h.post).toHaveBeenNthCalledWith(2, "/api/crm/unified/duplicates/merge-placeholders", { dryRun: false });
  });
});
