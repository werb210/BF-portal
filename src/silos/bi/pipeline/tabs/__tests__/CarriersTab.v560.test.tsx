// BF_PORTAL_BLOCK_v560_BI_SEND_TO_CARRIER
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
// The other tabs on the application page are not under test here.
vi.mock("../ApplicationTab", () => ({ default: () => <div>application tab</div> }));
vi.mock("../DocumentsTab", () => ({ default: () => null }));
vi.mock("../RequirementsTab", () => ({ default: () => null }));
vi.mock("../RequirementHistoryTab", () => ({ default: () => null }));
vi.mock("../PgiCommsTab", () => ({ default: () => null }));
vi.mock("../NotesTab", () => ({ default: () => null }));

import { carrierLabel } from "../CarriersTab";
import BIApplicationDetail from "../../BIApplicationDetail";

const base = { id: "c1", carrier: "TerrAssure", product_name: "Contractors Pollution Liability", notes: "", instant_bind: false,
  submission_email: null, submission_url: null, verified: false };

describe("v560 Carriers tab", () => {
  it("tells staff how each carrier will be reached", () => {
    expect(carrierLabel(base)).toBe("TerrAssure - Contractors Pollution Liability (name unverified, no contact on file)");
    expect(carrierLabel({ ...base, carrier: "CFC", instant_bind: true, verified: true, submission_email: "subs@cfc.example" }))
      .toBe("CFC - Contractors Pollution Liability (instant bind, email)");
    expect(carrierLabel({ ...base, submission_url: "https://portal.example" })).toContain("portal");
  });
});

const cfc = { ...base, id: "cp-cfc", carrier: "CFC", verified: true, submission_email: "subs@cfc.example" };
const coverage = {
  application_product_id: "ap1", code: "cpl", display_name: "Pollution Liability", country: "CA",
  stage: "not_sent", chosen_carrier: null, last_sent_at: null, carriers: [cfc],
};
const app = {
  id: "app-1", stage: "document_review", guarantor_name: "Pat", guarantor_email: "pat@example.com", business_name: "Acme",
  lender_name: null, data: {}, docs_review_required: false, all_docs_accepted: false, submission_locked: false,
};

function renderDetail(sourceType: "public" | "lender") {
  h.apiFn.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url === "/api/v1/bi/applications/app-1") return { ...app, source_type: sourceType };
    if (url === "/api/v1/bi/applications/app-1/carrier-options") return { products: [coverage] };
    if (init?.method === "POST") return { ok: true, method: "email", sentTo: "subs@cfc.example" };
    return {};
  });
  return render(
    <MemoryRouter initialEntries={["/silo/bi/pipeline/app-1"]}>
      <Routes><Route path="/silo/bi/pipeline/:id" element={<BIApplicationDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe("v560 Carriers tab on the BI application", () => {
  beforeEach(() => h.apiFn.mockReset());

  it("is a tab that loads carrier options and sends to the chosen carrier", async () => {
    renderDetail("public");
    fireEvent.click(await screen.findByRole("button", { name: "Carriers" }));
    const select = (await screen.findByLabelText("Carrier for Pollution Liability")) as HTMLSelectElement;
    expect(h.apiFn).toHaveBeenCalledWith("/api/v1/bi/applications/app-1/carrier-options");
    expect(select.value).toBe("cp-cfc");
    fireEvent.change(screen.getByLabelText("Note for Pollution Liability"), { target: { value: "rush" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to carrier" }));
    expect(await screen.findByText("Emailed to CFC (subs@cfc.example).")).toBeInTheDocument();
    const send = h.apiFn.mock.calls.find((c: any[]) => c[1]?.method === "POST");
    expect(send?.[0]).toBe("/api/v1/bi/applications/app-1/products/ap1/send-to-carrier");
    expect(JSON.parse(String(send?.[1].body))).toEqual({ carrierProductId: "cp-cfc", note: "rush" });
  });

  it("is read-only on a lender-submitted application", async () => {
    renderDetail("lender");
    fireEvent.click(await screen.findByRole("button", { name: "Carriers" }));
    await screen.findByLabelText("Carrier for Pollution Liability");
    await waitFor(() => expect(screen.getByRole("button", { name: "Send to carrier" })).toBeDisabled());
  });
});
