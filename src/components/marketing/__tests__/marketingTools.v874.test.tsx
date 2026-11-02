// BF_PORTAL_v874_MARKETING_TOOLS - the marketing tools ported from KS-Portal #42 without the Marketing add-on: lead
// score badges, the campaign send options (and where they show), the campaign and funded-deal report, the website kit,
// lead scoring rules, and the three new Marketing tabs per silo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({})) as any;
  for (const m of ["get", "post", "patch", "put", "delete"]) apiFn[m] = vi.fn(async () => ({}));
  return { apiFn };
});
vi.mock("@/api", () => ({
  api: h.apiFn,
  default: h.apiFn,
  http: h.apiFn,
  apiGetEnvelope: vi.fn(async () => ({ data: [], meta: { total: 0 } })),
  rawApiFetch: vi.fn(async () => new Response("{}")),
}));

import { ContactLeadScore, LeadScoreBadge } from "../LeadScore";
import CampaignSendOptions, { DEFAULT_SEND_OPTIONS, sendOptionsPayload, type SendOptions } from "../CampaignSendOptions";
import CampaignReportPanel, { abSummary } from "../CampaignReportPanel";
import WebsiteKitPanel from "../WebsiteKitPanel";
import LeadScoringPanel from "../LeadScoringPanel";
import BrandedEmailComposer from "../BrandedEmailComposer";
import MarketingDashboard from "@/pages/marketing/MarketingDashboard";
import SiloContext from "@/context/SiloContext";
import { serverMessage } from "../marketingTools";

beforeEach(() => {
  for (const m of ["get", "post", "patch", "put", "delete"]) h.apiFn[m].mockReset().mockResolvedValue({});
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("lead scores", () => {
  it("shows a readable badge with the reasons, and asks the server for the contact on screen", async () => {
    render(<LeadScoreBadge score={{ score: 72, grade: "hot", breakdown: [{ label: "Has a phone number", points: 10 }] }} />);
    const badge = screen.getByTestId("lead-score");
    expect(badge.textContent).toBe("72 Hot");
    expect(badge.getAttribute("aria-label")).toBe("Lead score 72 of 100, hot");
    expect(badge.getAttribute("title")).toBe("Has a phone number: +10");
    cleanup();
    h.apiFn.post.mockResolvedValue({ ok: true, scores: { c1: { score: 45, grade: "warm" } } });
    render(<ContactLeadScore contactId="c1" />);
    expect((await screen.findByTestId("lead-score")).textContent).toBe("45 Warm");
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/lead-scores/lookup", { contact_ids: ["c1"] });
  });

  it("shows nothing when the silo has no lead scoring", async () => {
    h.apiFn.post.mockResolvedValue({ ok: true, enabled: false, scores: {} });
    render(<ContactLeadScore contactId="c1" />);
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalled());
    expect(screen.queryByTestId("lead-score")).toBeNull();
  });

  it("lists the hottest leads and saves changed rules", async () => {
    h.apiFn.get.mockImplementation(async (url: string) => url.startsWith("/api/lead-scores/top")
      ? { contacts: [{ contact_id: "c1", score: 80, name: "Pat Lee", email: null, company_name: "Lee Paving" }], hot: 70, warm: 40 }
      : { settings: { rules: [{ kind: "has_phone", points: 10 }], engagement: { email_open: { points: 2, cap: 20 } }, hot: 70, warm: 40 }, engagement_labels: { email_open: "Opened an email" } });
    h.apiFn.put.mockResolvedValue({ settings: { rules: [{ kind: "has_phone", points: 15 }], engagement: { email_open: { points: 2, cap: 20 } }, hot: 70, warm: 40 } });
    render(<MemoryRouter><LeadScoringPanel /></MemoryRouter>);
    expect(await screen.findByText("Pat Lee")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Points"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await waitFor(() => expect(h.apiFn.put).toHaveBeenCalledWith("/api/lead-scores/settings", { settings: expect.objectContaining({ rules: [{ kind: "has_phone", points: 15 }] }) }));
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});

describe("campaign send options", () => {
  function Harness({ subjectA = "Spring rates" }: { subjectA?: string }) {
    const [v, setV] = useState<SendOptions>(DEFAULT_SEND_OPTIONS);
    return <><CampaignSendOptions value={v} onChange={setV} subjectA={subjectA} inputStyle={{}} labelStyle={{}} /><pre data-testid="payload">{JSON.stringify(sendOptionsPayload(v))}</pre></>;
  }

  it("builds the A/B test or best-time fields, never both", () => {
    render(<Harness />);
    expect(screen.getByTestId("payload").textContent).toBe("{}");
    fireEvent.click(screen.getByLabelText(/Test two subject lines first/));
    fireEvent.change(screen.getByLabelText(/Subject B/), { target: { value: "New rates are in" } });
    expect(JSON.parse(screen.getByTestId("payload").textContent!)).toEqual({ abTest: { subjectB: "New rates are in", testPercent: 20, waitHours: 4 } });
    fireEvent.click(screen.getByLabelText(/best time/));
    expect(JSON.parse(screen.getByTestId("payload").textContent!)).toEqual({ sendTime: "best" });
    expect((screen.getByLabelText(/Test two subject lines first/) as HTMLInputElement).checked).toBe(false);
  });

  it("warns when the two subject lines are the same", () => {
    render(<Harness subjectA="Same" />);
    fireEvent.click(screen.getByLabelText(/Test two subject lines first/));
    fireEvent.change(screen.getByLabelText(/Subject B/), { target: { value: "Same" } });
    expect(screen.getByText("The two subject lines are the same. Change one of them.")).toBeTruthy();
  });

  it("shows in the BF-Server composer only (not the BI-Server one)", async () => {
    h.apiFn.get.mockImplementation(async (url: string) => (url.includes("segments") ? { configured: true, all: 3, segments: [] } : {}));
    render(<BrandedEmailComposer />);
    expect(await screen.findByTestId("campaign-send-options")).toBeTruthy();
    cleanup();
    render(<BrandedEmailComposer apiBase="/api/v1/bi/marketing" />);
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalled());
    expect(screen.queryByTestId("campaign-send-options")).toBeNull();
  });

  it("shows the server's plain-words reason", () => {
    expect(serverMessage({ details: { error: { code: "ab_subjects_same", message: "The two subject lines are the same. Change one of them." } } }, "Send failed")).toBe("The two subject lines are the same. Change one of them.");
    expect(serverMessage({ details: { message: "bad_request" } }, "Send failed")).toBe("Send failed");
  });
});

describe("campaign report", () => {
  it("shows opens, clicks, applications and funded deals per campaign, with the A/B result", async () => {
    h.apiFn.get.mockResolvedValue({
      days: 90, attribution_days: 90, funded_included: true,
      totals: { sent: 120, applications: 3, funded: 1, funded_amount: 125000 },
      campaigns: [
        { id: "j1", channel: "email", name: "Spring rates", status: "done", sent_at: "2026-10-20T15:00:00Z", sent: 100, opened: 40, clicked: 10, unsubscribed: 1, open_rate: 40, click_rate: 10,
          ab: { subjectB: "New rates", winner: "B", results: { A: { sent: 10, opened: 2, clicked: 0 }, B: { sent: 10, opened: 5, clicked: 1 } } }, applications: 3, funded: 1, funded_amount: 125000 },
        { id: "s1", channel: "sms", name: "Text blast", status: "done", sent_at: "2026-10-10T15:00:00Z", sent: 20, opened: null, clicked: 2, unsubscribed: null, open_rate: null, click_rate: 10, applications: 0, funded: 0, funded_amount: 0 },
      ],
    });
    render(<CampaignReportPanel />);
    const row = await screen.findByTestId("campaign-j1");
    expect(within(row).getByText("40 (40%)")).toBeTruthy();
    expect(within(row).getByText("A/B test: subject B won (A 20% opened, B 50% opened).")).toBeTruthy();
    expect(row.textContent).toContain("125,000");
    expect(screen.getByTestId("campaign-report-totals").textContent).toContain("1 funded");
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/marketing/campaign-report?days=90");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "30" } });
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalledWith("/api/marketing/campaign-report?days=30"));
    expect(abSummary({ subjectB: "X" })).toMatch(/running/);
  });
});

describe("website kit", () => {
  const KIT = {
    silo: "BI", brand: "Boreal Insurance", consent_text: "I agree to receive calls, texts and emails from Boreal Insurance about my inquiry. I can unsubscribe at any time.",
    settings: { key: "a1b2c3d4e5f6a1b2c3d4e5f6", allowed_origins: ["https://partner.example.ca"], chat_enabled: false, tracking_enabled: false, consent_banner: true },
    forms: [{ id: "f1", name: "Quote", fields: [], button_label: "Send", thank_you: "Thanks", tag: null, active: true, submissions: 2, live: true }],
    snippet: { script: "<script src=\"https://server.boreal.financial/api/kit/a1b2c3d4e5f6a1b2c3d4e5f6/kit.js\" async></script>", forms: [{ id: "f1", name: "Quote", html: "<div data-boreal-form=\"f1\"></div>" }] },
  };

  it("shows the snippet, the consent wording and the forms with no limit, and adds a form", async () => {
    h.apiFn.get.mockResolvedValue(KIT);
    h.apiFn.post.mockResolvedValue({ ...KIT, forms: [...KIT.forms, { ...KIT.forms[0], id: "f2", name: "Equipment" }] });
    render(<WebsiteKitPanel />);
    expect((await screen.findByTestId("kit-script")).textContent).toContain("/api/kit/a1b2c3d4e5f6a1b2c3d4e5f6/kit.js");
    expect(screen.getByText(/Website kit for Boreal Insurance/)).toBeTruthy();
    expect(screen.getByTestId("kit-consent-text").textContent).toContain(KIT.consent_text);
    expect(within(screen.getByTestId("kit-form-f1")).getByText("Live")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "New form" }));
    fireEvent.change(within(screen.getByTestId("kit-form-editor")).getByLabelText("Form name"), { target: { value: "Equipment" } });
    fireEvent.click(screen.getByRole("button", { name: "Save form" }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/website-kit/forms", expect.objectContaining({ name: "Equipment" })));
    expect(await screen.findByTestId("kit-form-f2")).toBeTruthy();
  });

  it("switches the chat on and saves the website addresses", async () => {
    h.apiFn.get.mockResolvedValue(KIT);
    h.apiFn.put.mockResolvedValue({ ...KIT, settings: { ...KIT.settings, chat_enabled: true } });
    render(<WebsiteKitPanel />);
    fireEvent.click(await screen.findByLabelText(/AI chat widget/));
    await waitFor(() => expect(h.apiFn.put).toHaveBeenCalledWith("/api/website-kit/settings", expect.objectContaining({ chat_enabled: true, allowed_origins: ["https://partner.example.ca"] })));
  });
});

describe("Marketing tabs per silo", () => {
  const inSilo = (silo: string) => render(<MemoryRouter><SiloContext.Provider value={{ silo, setSilo: () => undefined } as any}><MarketingDashboard /></SiloContext.Provider></MemoryRouter>);

  it.each(["bf", "bi", "slf"])("offers the report, lead scoring and the website kit in %s", (silo) => {
    inSilo(silo);
    for (const name of ["Campaign report", "Lead scoring", "Website kit"]) expect(screen.getByRole("button", { name })).toBeTruthy();
  });

  it("does not offer them in the Keystone operations silo", () => {
    inSilo("ks");
    expect(screen.queryByRole("button", { name: "Campaign report" })).toBeNull();
  });

  it("opens the report tab", async () => {
    h.apiFn.get.mockImplementation(async (url: string) => (url.startsWith("/api/marketing/campaign-report") ? { days: 90, attribution_days: 90, funded_included: true, campaigns: [] } : {}));
    inSilo("bf");
    fireEvent.click(screen.getByRole("button", { name: "Campaign report" }));
    expect(await screen.findByText("No campaigns in this period yet.")).toBeTruthy();
  });
});
