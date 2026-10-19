// BF_PORTAL_v825_LENDER_REFERRALS - lenders send declined files from the lender portal; staff accept or decline them.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ api: vi.fn(), get: vi.fn(), raw: vi.fn() }));
vi.mock("@/api", () => {
  const api = Object.assign((...a: unknown[]) => h.api(...a), { get: (...a: unknown[]) => h.get(...a) });
  return { api, rawApiFetch: (...a: unknown[]) => h.raw(...a) };
});

import LenderReferralsSection, { detailsFor, phoneDigits, rowProblems, type ReferralRow } from "@/pages/lender/LenderReferralsSection";
import LenderReferralPanel from "../LenderReferralPanel";
import LenderReferralIssues, { stillReading, withoutCard } from "../LenderReferralIssues";
import { decisionText, type StaffReferral } from "../lenderReferralShared";

const zip = (name: string, size = 10) => { const f = new File(["x"], name, { type: "application/zip" }); Object.defineProperty(f, "size", { value: size }); return f; };
const row = (over: Partial<ReferralRow> = {}): ReferralRow => ({ key: "k", file: zip("northwind.zip"), businessName: "Northwind", clientName: "", clientPhone: "780-555-0100", amount: "", reason: "", ...over });

beforeEach(() => {
  h.api.mockReset(); h.get.mockReset(); h.raw.mockReset();
  sessionStorage.setItem("lender_token", "lt");
});

describe("lender portal: sending declined files", () => {
  it("checks every file before sending", () => {
    expect(phoneDigits("+1 (780) 555-0100")).toBe("7805550100");
    expect(rowProblems([row()], true)).toEqual([]);
    expect(rowProblems([row()], false)).toEqual(["Confirm each client agreed to be referred to Boreal Financial."]);
    expect(rowProblems([row({ businessName: " ", clientPhone: "555", file: zip("a.pdf") })], true)).toEqual([
      "File 1 (a.pdf): upload a .zip file.",
      "File 1 (a.pdf): enter the business name.",
      "File 1 (a.pdf): enter the client's 10-digit cell number.",
    ]);
    expect(rowProblems([row({ file: zip("big.zip", 60 * 1024 * 1024) })], true)[0]).toMatch("50 MB");
    expect(detailsFor([row({ amount: " 250,000 " })])[0]).toEqual({ business_name: "Northwind", client_name: null, client_phone: "780-555-0100", requested_amount: "250,000", decline_reason: null, consent: true });
  });

  it("sends several zips in one upload with the lender's token, then lists them", async () => {
    h.api.mockResolvedValueOnce({ files: [] }).mockResolvedValue({ files: [{ id: "r1", business_name: "Northwind", client_name: null, requested_amount: null, zip_name: "northwind.zip", sent_at: "2026-10-19T16:00:00Z", progress: "Under review", share: "-", payout_amount: null, payout_paid_on: null }] });
    h.raw.mockResolvedValue({ ok: true, status: 201, json: async () => ({ sent: 2, results: [{ file: "northwind.zip", ok: true }, { file: "contoso.zip", ok: true }] }) });
    render(<LenderReferralsSection />);
    expect(await screen.findByText("No files sent yet.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Choose client zip files"), { target: { files: [zip("northwind.zip"), zip("contoso_ltd.zip")] } });
    expect(screen.getAllByTestId("referral-row")).toHaveLength(2);
    expect((screen.getByLabelText("Business name for contoso_ltd.zip") as HTMLInputElement).value).toBe("");
    fireEvent.change(screen.getByLabelText("Business name for northwind.zip"), { target: { value: "Northwind" } });
    fireEvent.change(screen.getByLabelText("Business name for contoso_ltd.zip"), { target: { value: "Contoso Ltd" } });
    fireEvent.change(screen.getByLabelText("Client cell for northwind.zip"), { target: { value: "7805550100" } });
    fireEvent.change(screen.getByLabelText("Client cell for contoso_ltd.zip"), { target: { value: "4035550142" } });
    fireEvent.click(screen.getByRole("button", { name: "Send 2 files" }));
    expect((await screen.findByRole("alert")).textContent).toContain("agreed to be referred");
    expect(h.raw).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send 2 files" }));
    await waitFor(() => expect(h.raw).toHaveBeenCalledTimes(1));
    const [path, opts] = h.raw.mock.calls[0] as [string, { method: string; body: FormData; headers: Record<string, string> }];
    expect(path).toBe("/api/lender-referrals/mine");
    expect(opts.headers).toEqual({ Authorization: "Bearer lt" });
    expect(opts.body.getAll("files")).toHaveLength(2);
    expect(JSON.parse(String(opts.body.get("details"))).map((d: any) => d.client_phone)).toEqual(["7805550100", "4035550142"]);
    expect((await screen.findByRole("status")).textContent).toContain("Sent 2 files");
    expect(await screen.findByText("Under review")).toBeTruthy();
    expect(screen.queryAllByTestId("referral-row")).toHaveLength(0);
  });
});

const staffRow = (over: Partial<StaffReferral> = {}): StaffReferral => ({
  id: "r1", lender_name: "Prairie Bank", business_name: "Northwind Logistics", client_name: "Jane Smith", client_phone: "+17805550100",
  requested_amount: "250000.00", decline_reason: "Outside our credit box", zip_name: "northwind.zip", file_names: ["statements.pdf"],
  status: "pending", complete_package: null, decision_note: null, application_id: "app1", client_texted_at: null,
  created_at: "2026-10-19T16:00:00Z", import_error: null, has_zip: false, ...over,
});

// BF_PORTAL_v827_REFERRAL_PIPELINE_CARD - reviewed on the application (its pipeline card), not in Marketing.
describe("staff: lender referral on the application", () => {
  it("describes each decision", () => {
    expect(decisionText(staffRow())).toBe("Needs review - the client has not been contacted");
    expect(decisionText(staffRow({ status: "declined" }))).toBe("Declined - the client was not contacted");
    expect(decisionText(staffRow({ status: "accepted", complete_package: true, client_texted_at: "x" }))).toBe("Accepted (complete package, lender gets 50% of Boreal's fee) - client texted");
  });

  it("shows nothing on an application that did not come from a lender", async () => {
    h.get.mockResolvedValue({ referral: null });
    const { container } = render(<MemoryRouter><LenderReferralPanel applicationId="app9" /></MemoryRouter>);
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/lender-referrals/by-application/app9"));
    expect(container.textContent).toBe("");
  });

  it("accepting asks whether the package is complete before texting the client", async () => {
    h.get.mockResolvedValue({ referral: staffRow() });
    h.raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true, texted: true }) });
    render(<MemoryRouter><LenderReferralPanel applicationId="app1" /></MemoryRouter>);
    expect(await screen.findByText("Lender referral from Prairie Bank")).toBeTruthy();
    expect(screen.getByText("Why the lender declined: Outside our credit box")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept and text the client" }));
    expect(h.raw).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Choose whether this is a complete package.");
    fireEvent.click(screen.getByLabelText(/Yes - the lender gets 50%/));
    fireEvent.click(screen.getByRole("button", { name: "Accept and text the client" }));
    await waitFor(() => expect(h.raw).toHaveBeenCalledTimes(1));
    const [path, opts] = h.raw.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe("/api/lender-referrals/r1/accept");
    expect(JSON.parse(opts.body)).toEqual({ complete_package: true });
    expect((await screen.findByRole("status")).textContent).toBe("Accepted. The client was texted to sign in.");
  });

  it("declining asks for a reason and never contacts the client", async () => {
    h.get.mockResolvedValue({ referral: staffRow() });
    h.raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.spyOn(window, "prompt").mockReturnValue("Too early");
    render(<MemoryRouter><LenderReferralPanel applicationId="app1" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    await waitFor(() => expect(h.raw).toHaveBeenCalledWith("/api/lender-referrals/r1/decline", { method: "POST", body: JSON.stringify({ note: "Too early" }) }));
  });
});

describe("staff: lender files without a card yet (above the pipeline)", () => {
  it("lists only pending files with no application", () => {
    expect(withoutCard([staffRow(), staffRow({ id: "r2", application_id: null }), staffRow({ id: "r3", application_id: null, status: "declined" })]).map((r) => r.id)).toEqual(["r2"]);
  });

  it("offers download, try again and decline for a file that could not be read", async () => {
    h.get.mockResolvedValue({ referrals: [staffRow({ id: "r2", application_id: null, import_error: "OCR is down", has_zip: true })] });
    h.raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true, applicationId: "app2" }) });
    render(<LenderReferralIssues />);
    expect(await screen.findByText(/could not be read: OCR is down/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(h.raw).toHaveBeenCalledWith("/api/lender-referrals/r2/retry-import", { method: "POST", body: "{}" }));
  });

  it("offers the buttons for a file stuck without a card for over 10 minutes", () => {
    const now = Date.parse("2026-10-19T17:00:00Z");
    expect(stillReading({ import_error: null, created_at: "2026-10-19T16:55:00Z" }, now)).toBe(true);
    expect(stillReading({ import_error: null, created_at: "2026-10-19T16:30:00Z" }, now)).toBe(false);
    expect(stillReading({ import_error: "bad", created_at: "2026-10-19T16:59:00Z" }, now)).toBe(false);
  });

  it("shows nothing when every file has its card", async () => {
    h.get.mockResolvedValue({ referrals: [staffRow()] });
    const { container } = render(<LenderReferralIssues />);
    await waitFor(() => expect(h.get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});

describe("pipeline card badges for a lender referral", () => {
  it("marks it as a lender referral that needs review, then waiting for the client", async () => {
    const { brokerBadgeLabels } = await import("@/pages/pipeline/PipelinePage");
    expect(brokerBadgeLabels({ broker_name: "Prairie Bank", lender_referral_status: "pending", pipeline_state: "draft", broker_split_status: null }))
      .toEqual(["Lender referral: Prairie Bank", "Needs review"]);
    expect(brokerBadgeLabels({ broker_name: "Prairie Bank", lender_referral_status: "accepted", pipeline_state: "draft", broker_split_status: "accepted" }))
      .toEqual(["Lender referral: Prairie Bank", "Waiting for client"]);
    expect(brokerBadgeLabels({ broker_name: "Avance", pipeline_state: "draft", broker_split_status: null }))
      .toEqual(["From Avance", "Waiting for client", "No split yet"]);
  });
});
