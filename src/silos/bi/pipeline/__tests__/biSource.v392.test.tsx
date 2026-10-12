// BF_PORTAL_BI_SOURCE_LABEL_v392
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Staff" } }) }));
// The detail page's tabs are not under test here; only its header names the source.
vi.mock("../tabs/ApplicationTab", () => ({ default: () => <div>application tab</div> }));
vi.mock("../tabs/DocumentsTab", () => ({ default: () => null }));
vi.mock("../tabs/RequirementsTab", () => ({ default: () => null }));
vi.mock("../tabs/RequirementHistoryTab", () => ({ default: () => null }));
vi.mock("../tabs/PgiCommsTab", () => ({ default: () => null }));
vi.mock("../tabs/NotesTab", () => ({ default: () => null }));
vi.mock("../tabs/CarriersTab", () => ({ default: () => null }));

import { biSourceLabel, biSourceShort } from "../biSource";
import BIApplicationDetail from "../BIApplicationDetail";
import BIPipeline from "../BIPipeline";

describe("BI source labels", () => {
  it("names a BF referral instead of calling it public", () => {
    expect(biSourceLabel({ source: "bf_pgi_referral", source_type: "public" })).toBe("Boreal Financial referral");
    expect(biSourceLabel({ source_type: "public", bf_application_id: "bf-1" })).toBe("Boreal Financial referral");
    expect(biSourceShort({ source: "bf_pgi_referral" })).toBe("BF referral");
  });
  it("keeps lender and referrer labels", () => {
    expect(biSourceLabel({ source_type: "lender", lender_name: "ATB" })).toBe("Lender-submitted (ATB)");
    expect(biSourceShort({ source: "referrer" })).toBe("Referrer");
  });
  it("a boreal.insure applicant is a website application", () => {
    expect(biSourceLabel({ source_type: "public", source: "public" })).toBe("Website application");
    expect(biSourceShort({ source: "public" })).toBe("Website");
  });
});

const baseApp = { stage: "document_review", guarantor_name: "Pat Guarantor", guarantor_email: "pat@example.com", lender_name: null, data: {}, docs_review_required: false, all_docs_accepted: false, submission_locked: false };

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/silo/bi/pipeline/a1"]}>
      <Routes><Route path="/silo/bi/pipeline/:id" element={<BIApplicationDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe("no screen says Public any more", () => {
  beforeEach(() => h.apiFn.mockReset());

  it("the application page names a website applicant", async () => {
    h.apiFn.mockResolvedValue({ ...baseApp, id: "a1", business_name: "Web Co", source_type: "public", source: "public" });
    renderDetail();
    expect(await screen.findByText("Website application")).toBeInTheDocument();
    expect(screen.queryByText(/Public/)).not.toBeInTheDocument();
  });

  it("the application page names a BF referral", async () => {
    h.apiFn.mockResolvedValue({ ...baseApp, id: "a1", business_name: "Ref Co", source_type: "public", source: "bf_pgi_referral" });
    renderDetail();
    expect(await screen.findByText("Boreal Financial referral")).toBeInTheDocument();
    expect(screen.queryByText(/Public/)).not.toBeInTheDocument();
  });

  it("pipeline cards say Website / BF referral and the source filter offers BF referral", async () => {
    h.apiFn.mockResolvedValue([
      { id: "a1", stage: "document_review", source: "public", business_name: "Web Co", updated_at: "2026-10-01T00:00:00Z" },
      { id: "a2", stage: "document_review", source: "bf_pgi_referral", business_name: "Ref Co", updated_at: "2026-10-02T00:00:00Z" },
    ]);
    render(<MemoryRouter><BIPipeline /></MemoryRouter>);
    expect(await screen.findByText("Web Co")).toBeInTheDocument();
    expect(screen.getByText("Website", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("BF referral", { selector: "div" })).toBeInTheDocument();
    expect(screen.queryByText("Public")).not.toBeInTheDocument();

    const sourceFilter = screen.getByLabelText(/Source/) as HTMLSelectElement;
    const option = Array.from(sourceFilter.options).find((o) => o.value === "bf_pgi_referral");
    expect(option?.textContent).toBe("BF referral");
    expect(Array.from(sourceFilter.options).map((o) => o.textContent)).not.toContain("Public");
    fireEvent.change(sourceFilter, { target: { value: "bf_pgi_referral" } });
    expect(screen.queryByText("Web Co")).not.toBeInTheDocument();
    expect(screen.getByText("Ref Co")).toBeInTheDocument();
  });
});
