// BF_PORTAL_v828_PARTNER_PORTAL_THEME / PARTNER_STAGE_TRACKER / APPLICATION_ORIGIN
//   - lenders, brokers and referrers follow each file on a stage tracker (stage names only)
//   - the three portals use the UI guide's dark surfaces, button system and styled upload
//   - staff see "Where this came from" on any application a partner sent
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ api: vi.fn(), get: vi.fn(), raw: vi.fn() }));
vi.mock("@/api", () => {
  const api = Object.assign((...a: unknown[]) => h.api(...a), { get: (...a: unknown[]) => h.get(...a) });
  return { api, rawApiFetch: (...a: unknown[]) => h.raw(...a) };
});

import StageTracker, { trackerPosition, TRACKER_STEPS } from "../StageTracker";
import FileDrop from "../FileDrop";
import LenderReferralsSection, { referralTracker } from "@/pages/lender/LenderReferralsSection";
import { BrokerHome, brokerTracker } from "@/pages/broker/BrokerPortal";
import ApplicationOriginPanel, { splitText } from "@/pages/application/ApplicationOriginPanel";

beforeEach(() => { h.api.mockReset(); h.get.mockReset(); h.raw.mockReset(); });

describe("stage tracker", () => {
  it("has the six steps", () => {
    expect([...TRACKER_STEPS]).toEqual(["Received", "In Review", "Documents", "Submitted to lenders", "Offer", "Funded"]);
  });

  it("places every pipeline stage, in any casing", () => {
    const at = (stage: string | null) => trackerPosition({ stage }).index;
    expect(at("Received")).toBe(0);
    expect(at("In Review")).toBe(1);
    expect(at("Documents Required")).toBe(2);
    expect(at("additional_steps_required")).toBe(2);
    expect(at("Off to Lender")).toBe(3);
    expect(at("Offer")).toBe(4);
    expect(at("Accepted")).toBe(5);
    expect(at("funded")).toBe(5);
    expect(at("Hold")).toBe(1);
    expect(at("Fraud")).toBe(1); // never shown to a partner
    expect(trackerPosition({ stage: "Rejected" })).toEqual({ index: -1, closed: true, status: "Closed" });
    expect(trackerPosition({ stage: "draft" }).status).toBe("Received - waiting for the client to sign in");
    expect(trackerPosition({ stage: "Off to Lender" }).status).toBe("Submitted to lenders");
  });

  it("covers files that are not working applications yet", () => {
    expect(trackerPosition({ hold: "under_review" }).status).toBe("Received - Boreal is reviewing the file");
    expect(trackerPosition({ hold: "not_accepted" })).toMatchObject({ closed: true, status: "Not accepted - Boreal could not take this file" });
    expect(trackerPosition({ hold: "unreadable" }).status).toBe("Received - Boreal is checking the upload");
  });

  it("marks the current step for screen readers", () => {
    render(<StageTracker stage="Offer" label="Stage for Acme" />);
    const list = screen.getByRole("list", { name: "Stage for Acme" });
    expect(list.querySelector("[aria-current=step]")?.textContent).toBe("Offer");
    expect(list.querySelectorAll(".pp-tracker__step--done")).toHaveLength(4);
    expect(screen.getByTestId("stage-status").textContent).toBe("Current stage: Offer");
  });

  it("shows a closed file with no current step", () => {
    render(<StageTracker stage="Rejected" />);
    expect(document.querySelector("[aria-current=step]")).toBeNull();
    expect(screen.getByTestId("stage-status").textContent).toBe("Closed");
  });

  it("maps lender referrals and broker files", () => {
    expect(referralTracker({ status: "pending", stage: null })).toEqual({ hold: "under_review" });
    expect(referralTracker({ status: "declined", stage: null })).toEqual({ hold: "not_accepted" });
    expect(trackerPosition(referralTracker({ status: "accepted", stage: "draft" })).status).toBe("Received - waiting for the client to sign in");
    expect(trackerPosition(referralTracker({ status: "accepted", stage: "Off to Lender" })).index).toBe(3);
    expect(brokerTracker({ import_status: "failed", stage: null })).toEqual({ hold: "unreadable" });
    expect(brokerTracker({ import_status: "discarded", stage: null })).toEqual({ hold: "not_accepted" });
    expect(trackerPosition(brokerTracker({ import_status: "awaiting_client", stage: "In Review" })).index).toBe(1);
  });
});

describe("styled upload", () => {
  it("takes picked files and dropped files", () => {
    const onFiles = vi.fn();
    render(<FileDrop label="Client zip" title="Tap to choose" accept=".zip" onFiles={onFiles} />);
    const zip = new File(["x"], "a.zip", { type: "application/zip" });
    fireEvent.change(screen.getByLabelText("Client zip"), { target: { files: [zip] } });
    expect(onFiles).toHaveBeenLastCalledWith([zip]);
    fireEvent.drop(screen.getByText("Tap to choose").parentElement!, { dataTransfer: { files: [zip] } });
    expect(onFiles).toHaveBeenCalledTimes(2);
  });
});

describe("partner portals follow the UI guide", () => {
  it("puts the broker portal on the dark theme with a styled upload and a tracker per file", async () => {
    h.api.mockImplementation(async (url: string) => url.endsWith("/me") ? { broker: { company: "Avance", name: "Jeremy Lane" } }
      : { files: [{ import_id: "i1", application_id: "a1", business_name: "Acme Ltd", zip_name: "acme.zip", import_status: "awaiting_client", stage: "Offer",
        created_at: "2026-10-01T00:00:00Z", boreal_pct: null, broker_pct: null, terms: null, split_status: null, broker_counter_pct: null, payout_amount: null, payout_paid_on: null }] });
    sessionStorage.setItem("referrer_token", "t");
    const { container } = render(<MemoryRouter><BrokerHome /></MemoryRouter>);
    expect(await screen.findByText("Acme Ltd")).toBeTruthy();
    expect(container.firstElementChild?.classList.contains("partner-portal")).toBe(true);
    expect(screen.getByLabelText("Client zip file").closest(".pp-drop")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Stage for Acme Ltd" }).querySelector("[aria-current=step]")?.textContent).toBe("Offer");
    expect(screen.getByText("Welcome Jeremy")).toBeTruthy();
  });

  it("gives the lender's declined-file upload the styled box", async () => {
    h.api.mockResolvedValue({ files: [] });
    render(<LenderReferralsSection />);
    expect(await screen.findByText("No files sent yet.")).toBeTruthy();
    expect(screen.getByLabelText("Choose client zip files").closest(".pp-drop")).toBeTruthy();
  });
});

describe("staff: where an application came from", () => {
  it("describes the broker split", () => {
    expect(splitText(null)).toBe("No split agreed yet - set it on the Lenders tab.");
    expect(splitText({ borealPct: 60, partnerPct: 40, terms: null, status: "accepted", payoutAmount: null, payoutPaidOn: null })).toBe("Agreed: Boreal 60% / broker 40%");
  });

  it("shows a broker file's origin", async () => {
    h.get.mockResolvedValue({ origin: { kind: "broker", partner: "Avance", sentAt: "2026-10-18T12:00:00Z", zipName: "acme.zip", uploadedBy: null,
      split: { borealPct: 60, partnerPct: 40, terms: "On funding", status: "accepted", payoutAmount: null, payoutPaidOn: null } } });
    render(<MemoryRouter><ApplicationOriginPanel applicationId="app2" /></MemoryRouter>);
    expect(await screen.findByText("Broker file from Avance")).toBeTruthy();
    expect(h.get).toHaveBeenCalledWith("/api/application-origin/app2");
    expect(screen.getByText("Where this came from")).toBeTruthy();
    expect(screen.getByText("Agreed: Boreal 60% / broker 40% (On funding)")).toBeTruthy();
  });

  it("shows a referred client's origin", async () => {
    h.get.mockResolvedValue({ origin: { kind: "referrer", partner: "Anthony Allen", company: "Allen Advisory", email: "a@x.ca", phone: "+14035550100", sentAt: "2026-10-01T09:00:00Z" } });
    render(<MemoryRouter><ApplicationOriginPanel applicationId="app3" /></MemoryRouter>);
    expect(await screen.findByText("Referred by Anthony Allen (Allen Advisory)")).toBeTruthy();
    expect(screen.getByText(/a@x\.ca · \(403\) 555-0100/)).toBeTruthy();
  });

  it("shows the lender referral with Accept / Decline, loaded once", async () => {
    h.get.mockResolvedValue({ origin: { kind: "lender", partner: "Prairie Bank", sentAt: "2026-10-19T16:00:00Z", referral: {
      id: "r1", lender_name: "Prairie Bank", business_name: "Northwind", client_name: null, client_phone: "+17805550100", requested_amount: null,
      decline_reason: null, zip_name: "n.zip", status: "pending", complete_package: null, decision_note: null, application_id: "app1",
      client_texted_at: null, created_at: "2026-10-19T16:00:00Z", has_zip: false } } });
    render(<MemoryRouter><ApplicationOriginPanel applicationId="app1" /></MemoryRouter>);
    expect(await screen.findByText("Lender referral from Prairie Bank")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
    await waitFor(() => expect(h.get).toHaveBeenCalledTimes(1));
  });

  it("shows nothing for a website application", async () => {
    h.get.mockResolvedValue({ origin: null });
    const { container } = render(<MemoryRouter><ApplicationOriginPanel applicationId="app4" /></MemoryRouter>);
    await waitFor(() => expect(h.get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
