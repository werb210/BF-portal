// BF_PORTAL_v860_MARK_SIGNED - an Admin can file a fully signed application whose signed event never arrived.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const fn: any = vi.fn(async () => ({ data: { ok: true, finalized: true } }));
  fn.get = vi.fn(async (url: string) => (String(url).includes("signing-readiness") ? { data: { reason: "started", canSend: false, isSba: false } } : { data: [] }));
  fn.post = vi.fn(async () => ({ data: { ok: true } }));
  return { api: fn };
});
vi.mock("@/api", () => ({ api: h.api, default: h.api }));
vi.mock("@/api/applicationTasks", () => ({ fetchTaskStatus: vi.fn(async () => ({ tasks: [], summary: { total: 0, complete: 0 } })) }));
vi.mock("@/api/formResponses", () => ({ getFormResponse: vi.fn(async () => null) }));
vi.mock("@/pages/applications/tabs/ProductQuestionsPanel", () => ({ default: () => null }));
vi.mock("@/native/dialerLauncher", () => ({ placeCall: vi.fn() }));

import ApplicationTab from "../ApplicationTab";

const show = (status: string) =>
  render(
    <MemoryRouter>
      <ApplicationTab application={{
        id: "app-860", contactId: "c-860", businessDetails: { legalName: "Poke Prod LLC" },
        applicantDetails: { firstName: "Sean", lastName: "Dwyer" }, signing: { status }, rawPayload: {},
      } as any} />
    </MemoryRouter>,
  );

beforeEach(() => { h.api.mockClear(); });

describe("v860 Mark as signed", () => {
  it("shows only while signing has started", () => {
    show("signed");
    expect(screen.queryByTestId("mark-signed")).toBeNull();
  });
  it("confirms, calls the admin route and says the package is on its way", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    show("started");
    fireEvent.click(screen.getByTestId("mark-signed"));
    expect(await screen.findByText(/lender package is on its way/)).toBeTruthy();
    expect(h.api).toHaveBeenCalledWith("/api/admin/applications/app-860/mark-signed", { method: "POST" });
    expect(screen.queryByTestId("mark-signed")).toBeNull();
  });
  it("does nothing when the confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show("started");
    fireEvent.click(screen.getByTestId("mark-signed"));
    expect(h.api).not.toHaveBeenCalledWith("/api/admin/applications/app-860/mark-signed", { method: "POST" });
  });
});
