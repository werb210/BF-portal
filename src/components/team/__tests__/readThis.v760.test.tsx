// BF_PORTAL_READ_THIS_v760 / BF_PORTAL_REPORTS_BATCH5_v760
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/lib/authToken", async (orig) => ({ ...(await orig<Record<string, unknown>>()), getAuthToken: () => "x." + btoa(JSON.stringify({ sub: "me" })) + ".y" }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => "ws://test/api/team/ws?token=t"), getUrlTicket: vi.fn(async () => "t") }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/components/team/TeamNotifier", () => ({ setViewingTeamChannel: vi.fn() }));
vi.mock("@/hooks/usePushRegistration", () => ({ registerExistingPushPermission: vi.fn(async () => undefined) }));
vi.mock("@/dialer/actions", () => ({ startInternalCall: vi.fn(), startOutboundPstn: vi.fn() }));
const get = h.apiFn.get, post = h.apiFn.post;
import { ReadThisBar, ShareFileModal, applyReadThisEvent, readThisSummary } from "../ReadThis";
import { renderReport } from "@/pages/reports/ReportDataCards";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";

const names: Record<string, string> = { todd: "Todd", andrew: "Andrew", caden: "Caden" };
const name = (id: string) => names[id] ?? id;
beforeEach(() => { get.mockReset(); post.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("Read this", () => {
  const msg = { id: "m1", sender_id: "todd", read_this: true, read_by: [{ user_id: "andrew", read_at: "2026-10-07T20:00:00Z" }] };
  it("the sender sees who has read it and who has not", () => {
    expect(readThisSummary(msg, ["todd", "andrew", "caden"], name)).toEqual({ read: ["Andrew"], waiting: ["Caden"] });
    render(<ReadThisBar message={msg} meId="todd" memberIds={["todd", "andrew", "caden"]} name={name} onRead={() => undefined} />);
    expect(screen.getByTestId("read-this-status").textContent).toBe("Read by Andrew \u00B7 Waiting: Caden");
  });
  it("a reader taps Mark as read", async () => {
    post.mockResolvedValue({ receipt: { user_id: "caden", read_at: "2026-10-07T21:00:00Z" } });
    const onRead = vi.fn();
    render(<ReadThisBar message={msg} meId="caden" memberIds={["todd", "andrew", "caden"]} name={name} onRead={onRead} />);
    fireEvent.click(screen.getByTestId("read-this-mark"));
    await waitFor(() => expect(onRead).toHaveBeenCalledWith({ user_id: "caden", read_at: "2026-10-07T21:00:00Z" }));
    expect(post).toHaveBeenCalledWith("/api/team/messages/m1/read-receipt", {});
  });
  it("live receipts are added once", () => {
    const out = applyReadThisEvent([msg], { message_id: "m1", user_id: "caden", read_at: "x" });
    expect(out[0]!.read_by).toHaveLength(2);
    expect(applyReadThisEvent(out, { message_id: "m1", user_id: "caden" })[0]!.read_by).toHaveLength(2);
  });
  it("ordinary messages show nothing", () => {
    const { container } = render(<ReadThisBar message={{ id: "m2", sender_id: "x" }} meId="todd" memberIds={[]} name={name} onRead={() => undefined} />);
    expect(container.textContent).toBe("");
  });
});

// The Team tab of Communications: the Read this tick box, the bar on messages, live receipts.
class FakeWS {
  static last: FakeWS | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) { FakeWS.last = this; }
  close() { /* noop */ }
  send() { /* noop */ }
}
describe("Read this in Team chat", () => {
  const users = [{ id: "me", name: "Todd", email: null }, { id: "andrew", name: "Andrew", email: null }, { id: "caden", name: "Caden", email: null }];
  const channels = [{ id: "c1", kind: "channel", name: "general", member_ids: ["me", "andrew", "caden"], unread_count: 0, last_message: null }];
  const mine = { id: "m1", channel_id: "c1", sender_id: "me", body: "Please read the new policy", created_at: "2026-10-07T18:00:00Z", read_this: true, read_by: [] };
  const theirs = { id: "m2", channel_id: "c1", sender_id: "andrew", body: "Read the lender memo", created_at: "2026-10-07T18:05:00Z", read_this: true, read_by: [] };
  beforeEach(() => {
    h.apiFn.mockReset();
    h.apiFn.mockImplementation(async (url: string) => {
      if (url === "/api/team/channels") return { channels };
      if (url === "/api/team/users") return { users };
      if (url === "/api/team/channels/c1/messages") return { messages: [mine, theirs] };
      if (url.startsWith("/api/templates")) return [];
      return {};
    });
    post.mockImplementation(async (url: string, body: any) => {
      if (url === "/api/team/channels/c1/messages") return { message: { id: "new" + post.mock.calls.length, channel_id: "c1", sender_id: "me", body: body.body, created_at: "2026-10-07T19:00:00Z", read_this: Boolean(body.read_this) } };
      if (url === "/api/team/messages/m2/read-receipt") return { receipt: { user_id: "me", read_at: "2026-10-07T19:00:00Z" } };
      return {};
    });
    FakeWS.last = null;
    vi.stubGlobal("WebSocket", FakeWS);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  async function openGeneral() {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    fireEvent.click(await screen.findByText("# general"));
    await screen.findByText("Please read the new policy");
  }
  const sends = () => post.mock.calls.filter((c: unknown[]) => c[0] === "/api/team/channels/c1/messages").map((c: unknown[]) => c[1] as Record<string, unknown>);

  it("ticking Read this sends the flag, once", async () => {
    await openGeneral();
    const draft = screen.getByTestId("team-draft");
    fireEvent.click(screen.getByTestId("team-read-this"));
    fireEvent.change(draft, { target: { value: "Read me" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(sends()[0]).toMatchObject({ body: "Read me", read_this: true });
    expect(screen.getByTestId("team-read-this")).not.toBeChecked();
    fireEvent.change(draft, { target: { value: "Ordinary" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(sends()).toHaveLength(2));
    expect(sends()[1]).not.toHaveProperty("read_this");
  });

  it("messages show the bar: the sender sees who is waiting, a reader can mark it read", async () => {
    await openGeneral();
    const bars = screen.getAllByTestId("read-this-bar");
    expect(bars).toHaveLength(2);
    expect(within(bars[0]!).getByTestId("read-this-status").textContent).toBe("Nobody has read it yet \u00B7 Waiting: Andrew, Caden");
    fireEvent.click(within(bars[1]!).getByTestId("read-this-mark"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/team/messages/m2/read-receipt", {}));
    expect(await within(bars[1]!).findByText(/You read this/)).toBeInTheDocument();
  });

  it("a live read_this event updates the sender's bar", async () => {
    await openGeneral();
    await waitFor(() => expect(FakeWS.last).not.toBeNull());
    act(() => { FakeWS.last!.onmessage!({ data: JSON.stringify({ type: "read_this", channel_id: "c1", message_id: "m1", user_id: "caden", read_at: "2026-10-07T20:00:00Z" }) }); });
    expect(screen.getAllByTestId("read-this-status")[0]!.textContent).toBe("Read by Caden \u00B7 Waiting: Andrew");
  });
});

describe("Share file", () => {
  it("browses the Staff Library and drops a company link into the message", async () => {
    get.mockImplementation(async (url: string) => url.includes("item=f1")
      ? { configured: true, url: "https://lib", items: [{ id: "x", name: "Bizcap form.pdf", webUrl: "https://x/form", isFolder: false }] }
      : { configured: true, url: "https://lib", items: [{ id: "f1", name: "Lender Forms", webUrl: null, isFolder: true }] });
    const onPick = vi.fn();
    render(<ShareFileModal open onClose={() => undefined} onPick={onPick} />);
    fireEvent.click(await screen.findByText(/Lender Forms/));
    fireEvent.click(await screen.findByText(/Bizcap form\.pdf/));
    expect(onPick).toHaveBeenCalledWith({ name: "Bizcap form.pdf", url: "https://x/form" });
  });
  it("offers to create the Staff Library when there is none", async () => {
    get.mockResolvedValue({ configured: false, items: [] });
    post.mockResolvedValue({ ok: true });
    render(<ShareFileModal open onClose={() => undefined} onPick={() => undefined} />);
    fireEvent.click(await screen.findByText("Create the Staff Library"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/o365/library/ensure", {}));
  });
});

describe("new report cards", () => {
  it("render each report", () => {
    render(<div>{renderReport("deal_velocity", { days: 365, rows: [{ product: "MEDIA", funded: 1, to_submit: 5, to_offer: 15, offer_to_funded: 10, total: 30 }] })}{renderReport("win_rate", { days: 365, months: [{ label: "2026-09", submitted: 3, funded: 1, lost: 1, open: 1, win_rate: 50 }], products: [] })}{renderReport("call_outcomes", { days: 30, rows: [{ staff: "Todd", outcome: "left voicemail", calls: 2 }] })}{renderReport("client_reply_time", { channels: [{ channel: "sms", messages: 2, answered: 1, median_minutes: 60 }], waiting: [{ name: "Clarice Gray", channel: "sms", minutes_waiting: 30 }] })}</div>);
    expect(screen.getByText("30 d")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("left voicemail")).toBeTruthy();
    expect(screen.getByText("Clarice Gray")).toBeTruthy();
    expect(screen.getByText("1 h")).toBeTruthy();
  });
  it("commission receivable records a payment", async () => {
    post.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("");
    render(<div>{renderReport("commission_receivable", { items: [{ application_id: "a1", name: "App a1", lender: "L", funded_at: "2026-09-27", days_since_funded: 10, expected: 2000, currency: "CAD", commission_received_at: null }], buckets: [{ age: "0-30 days", files: 1, expected: 2000 }] })}</div>);
    fireEvent.click(screen.getByTestId("commission-mark-received"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/reports/commission-received", { applicationId: "a1", amount: 2000 }));
    expect(await screen.findByText(/on 20/)).toBeTruthy();
  });
});
