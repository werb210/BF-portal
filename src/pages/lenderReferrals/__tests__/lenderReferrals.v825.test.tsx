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
import LenderReferralsPage, { decisionText, type StaffReferral } from "../LenderReferralsPage";

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
    expect((screen.getByLabelText("Business name for contoso_ltd.zip") as HTMLInputElement).value).toBe("contoso ltd");
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
  requested_amount: "250000.00", decline_reason: "Outside our credit box", zip_name: "northwind.zip", zip_size: 100, file_names: ["statements.pdf"],
  status: "pending", complete_package: null, decision_note: null, decided_at: null, application_id: null, client_texted_at: null,
  created_at: "2026-10-19T16:00:00Z", progress: "Under review", has_zip: true, ...over,
});

describe("staff: lender referrals queue", () => {
  it("describes each decision", () => {
    expect(decisionText(staffRow())).toBe("Waiting for review");
    expect(decisionText(staffRow({ status: "declined" }))).toBe("Declined - the client was not contacted");
    expect(decisionText(staffRow({ status: "accepted", complete_package: true, client_texted_at: "x" }))).toBe("Accepted (complete package, lender gets 50% of Boreal's fee) - client texted");
  });

  it("accepting asks whether the package is complete before importing", async () => {
    h.get.mockResolvedValue({ referrals: [staffRow()] });
    h.raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true, texted: true }) });
    render(<MemoryRouter><LenderReferralsPage /></MemoryRouter>);
    expect(await screen.findByText("Northwind Logistics")).toBeTruthy();
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
    h.get.mockResolvedValue({ referrals: [staffRow()] });
    h.raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.spyOn(window, "prompt").mockReturnValue("Too early");
    render(<MemoryRouter><LenderReferralsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    await waitFor(() => expect(h.raw).toHaveBeenCalledWith("/api/lender-referrals/r1/decline", { method: "POST", body: JSON.stringify({ note: "Too early" }) }));
  });
});
