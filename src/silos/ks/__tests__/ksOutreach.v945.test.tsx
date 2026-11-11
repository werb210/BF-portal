// BF_PORTAL_v945_KS_OUTREACH - Keystone marketing: the list file reader, the batched import, the channel scoreboard,
// the owner call list and referrals, against a mocked KS-Ops client. All names are invented.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Fn = ReturnType<typeof vi.fn>;
const h = vi.hoisted(() => ({ api: {} as Record<"importRows" | "channels" | "items" | "saveChannel" | "callList" | "addTouch" | "referrals" | "addReferral" | "saveReferral", Fn> & Record<string, Fn>, dial: vi.fn() }));
vi.mock("../marketing/outreach/outreachApi", async (orig) => {
  const real = await orig<Record<string, unknown>>();
  for (const k of Object.keys(real.outreachApi as object)) h.api[k] = vi.fn();
  return { ...real, outreachApi: h.api };
});
vi.mock("@/dialer/store", () => ({ openDialer: (...a: unknown[]) => h.dial(...a) }));

import { parseCsv, toImportRows } from "../marketing/outreach/listFile";
import { ImportList } from "../marketing/outreach/KsBrokerages";
import KsChannels, { KsCallList, KsReferrals } from "../marketing/outreach/KsChannels";

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
const channel = (over: Record<string, unknown>) => ({
  key: "phone", name: "Phone calls to owners", active: true, test_started_on: null, test_weeks: 4, budget_cents: 0, decision: "testing", notes: null, touches: 0, firms: 0, replies: 0,
  conversations: 0, owner_conversations: 0, demos: 0, signups: 0, clicks: 0, cost_cents: 0, items: 0, test_ends_on: null, test_days_left: null, cost_per_owner_conversation_cents: null, over_budget: false, ...over,
});

beforeEach(() => { for (const f of Object.values(h.api)) f.mockReset(); h.dial.mockReset(); });

describe("list file", () => {
  it("reads quoted CSV cells and matches the export's column names in any order", () => {
    const grid = parseCsv('Company,Contact Name,Title,Business Email,Direct or Company Phone,Mobile Do Not Call,ZoomInfo Company ID,Employees,Notes\r\n"Northfield Leasing, Inc.",Olive Owner,"President, ""Founder""",olive@northfield.example,(555) 010-0001,Y,C100,14,ignored\r\n,No Firm,,,,,,,\r\n');
    const out = toImportRows(grid);
    expect(out.error).toBeUndefined();
    expect(out.unknown).toEqual(["notes"]);
    expect(out.rows).toEqual([{ company: "Northfield Leasing, Inc.", contact_name: "Olive Owner", title: 'President, "Founder"', email: "olive@northfield.example", direct_phone: "(555) 010-0001", mobile_dnc: "Y", company_id: "C100", employee_count: "14" }]);
  });
  it("needs a Company column", () => {
    expect(toImportRows([["Name", "Email"], ["Pat", "pat@x.example"]]).error).toMatch(/Company/);
  });
});

describe("import a list", () => {
  it("sends a long list in batches of 500 and adds up the result", async () => {
    h.api.importRows.mockImplementation(async (rows: unknown[]) => ({ rows: rows.length, brokerages_added: rows.length, brokerages_updated: 0, people_added: rows.length, people_updated: 0, prospects_linked: 0, excluded: 0, skipped: [] }));
    const done = vi.fn();
    wrap(<ImportList onDone={done} />);
    const csv = ["Company,Contact Name", ...Array.from({ length: 1201 }, (_, i) => `Firm ${i},Person ${i}`)].join("\n");
    const file = new File([csv], "brokers.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => csv });
    fireEvent.change(screen.getByLabelText("List file"), { target: { files: [file] } });
    expect(await screen.findByTestId("import-preview")).toHaveTextContent("1,201 people at 1,201 firms");
    expect(screen.getByTestId("import-preview")).toHaveTextContent("No mailing address column");
    fireEvent.click(screen.getByTestId("import-run"));
    expect(await screen.findByTestId("import-result")).toHaveTextContent("Added 1,201 firms and 1,201 people");
    expect(h.api.importRows.mock.calls.map((c) => (c[0] as unknown[]).length)).toEqual([500, 500, 201]);
    expect(h.api.importRows.mock.calls[0]![1]).toBeNull(); // no consent recorded: they cannot be emailed yet
    expect(done).toHaveBeenCalled();
  });
});

describe("channels", () => {
  it("shows the scoreboard, starts a test and records keep or drop", async () => {
    h.api.channels.mockResolvedValue({ channels: [channel({ touches: 12, firms: 9, owner_conversations: 3, cost_cents: 6000, cost_per_owner_conversation_cents: 2000 }), channel({ key: "mail", name: "Physical mail", test_started_on: "2026-11-01", test_days_left: 18, test_ends_on: "2026-11-29" })] });
    h.api.items.mockResolvedValue({ items: [] });
    h.api.saveChannel.mockResolvedValue({ channels: [] });
    wrap(<KsChannels />);
    expect(await screen.findByTestId("channel-phone")).toHaveTextContent("Not started");
    expect(screen.getByTestId("channel-phone")).toHaveTextContent("$20.00");
    expect(screen.getByTestId("channel-mail")).toHaveTextContent("18 days left");
    fireEvent.click(screen.getByTestId("channel-open-phone"));
    fireEvent.click(await screen.findByTestId("channel-start-phone"));
    await waitFor(() => expect(h.api.saveChannel).toHaveBeenCalledWith("phone", expect.objectContaining({ decision: "testing", test_started_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })));
    fireEvent.click(screen.getByTestId("channel-drop-phone"));
    await waitFor(() => expect(h.api.saveChannel).toHaveBeenCalledWith("phone", { decision: "drop" }));
  });
});

describe("call list", () => {
  it("dials through the portal dialer and logs the outcome against the phone channel", async () => {
    h.api.callList.mockResolvedValue({ calls: [{ person_id: "p1", name: "Olive Owner", title: "President", is_owner: true, direct_phone: "(555) 010-0001", mobile_phone: null, brokerage_id: "b1", brokerage: "Northfield Leasing", country: "CA", province_state: "AB", fit_score: 90, current_tools: ["HubSpot"], calls: 0 }] });
    h.api.addTouch.mockResolvedValue({ id: "t1" });
    wrap(<KsCallList />);
    fireEvent.click(await screen.findByRole("button", { name: "(555) 010-0001" }));
    expect(h.dial).toHaveBeenCalledWith({ phone: "(555) 010-0001", contactName: "Olive Owner (Northfield Leasing)", source: "ks_outreach" });
    fireEvent.change(screen.getByLabelText("Note for Olive Owner"), { target: { value: "Tuesday 2pm" } });
    fireEvent.click(screen.getByTestId("call-p1-owner_conversation"));
    await waitFor(() => expect(h.api.addTouch).toHaveBeenCalledWith({ channel_key: "phone", brokerage_id: "b1", person_id: "p1", outcome: "owner_conversation", summary: "Tuesday 2pm" }));
  });
});

describe("referrals", () => {
  it("adds a referral and marks the reward applied", async () => {
    h.api.referrals.mockResolvedValue({ owed_cents: 14700, referrals: [{ id: "r1", referrer_name: "First Customer", code: "ABCD2345", referred_name: "Solo Capital", referred_brokerage: null, status: "reward_owed", reward: "One month free per seat", reward_cents: 14700, reward_applied_at: null, notes: null, created_at: "2026-11-11T00:00:00Z" }] });
    h.api.addReferral.mockResolvedValue({ referral: {} });
    h.api.saveReferral.mockResolvedValue({ referral: {} });
    wrap(<KsReferrals />);
    expect(await screen.findByTestId("referral-r1")).toHaveTextContent("ABCD2345");
    expect(screen.getByText("$147.00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status of referral ABCD2345"), { target: { value: "reward_applied" } });
    await waitFor(() => expect(h.api.saveReferral).toHaveBeenCalledWith("r1", { status: "reward_applied" }));
    fireEvent.change(screen.getByLabelText("Referrer"), { target: { value: "Second Customer" } });
    fireEvent.change(screen.getByLabelText("Reward amount"), { target: { value: "98" } });
    fireEvent.click(screen.getByTestId("referral-add"));
    await waitFor(() => expect(h.api.addReferral).toHaveBeenCalledWith({ referrer_name: "Second Customer", referred_name: null, reward: "One month free per seat", reward_cents: 9800 }));
  });
});
