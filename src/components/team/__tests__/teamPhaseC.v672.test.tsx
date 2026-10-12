// BF_PORTAL_TEAM_PHASE_C_v672
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn, posted: [] as Array<[string, any]>, startInternalCall: vi.fn(async () => undefined) };
});
const posted = h.posted;
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/lib/authToken", async (orig) => ({ ...(await orig<Record<string, unknown>>()), getAuthToken: () => "x." + btoa(JSON.stringify({ sub: "me" })) + ".y" }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => "ws://test/api/team/ws?token=t"), getUrlTicket: vi.fn(async () => "t") }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/hooks/usePushRegistration", () => ({ registerExistingPushPermission: vi.fn(async () => undefined) }));
vi.mock("@/dialer/actions", () => ({ startInternalCall: h.startInternalCall, startOutboundPstn: vi.fn() }));

import { cardRefs, remindTime, SaveMenu, TeamCards } from "@/components/team/TeamPhaseC";
import ThreadPanel from "@/components/team/ThreadPanel";
import TeamNotifier from "@/components/team/TeamNotifier";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";

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

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const APP = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

const users = [{ id: "me", name: "Todd", email: null }, { id: "andrew", name: "Andrew", email: null }];
const channels = [{ id: "d1", kind: "dm", name: null, member_ids: ["me", "andrew"], unread_count: 0, last_message: null }];
const teamMessages = [
  { id: "m1", channel_id: "d1", sender_id: "andrew", body: "See /applications/" + APP, created_at: "2026-10-07T18:00:00Z" },
  { id: "m2", channel_id: "d1", sender_id: null, bot: "Lender Bot", body: "Hi, Maya here", created_at: "2026-10-07T18:01:00Z" },
];

function routeApi(url: string, opts?: any): unknown {
  if (url === "/api/team/cards") {
    const ids = String(opts?.params?.ids ?? "").split(",");
    return { cards: ids.map((k) => { const [kind, id] = k.split(":"); return { kind, id, title: kind === "contact" ? "Sam Lee" : id === APP ? "Walter's Bakery LOC" : "Todd's Gym LOC", subtitle: "Offer \u00B7 $150,000", url: (kind === "contact" ? "/crm/contacts/" : "/applications/") + id }; }) };
  }
  if (url === "/api/team/channels") return { channels };
  if (url === "/api/team/users") return { users };
  if (url === "/api/team/channels/d1/messages") return { messages: teamMessages };
  if (url === "/api/team/saved") return { saved: [{ message_id: "m9", channel_id: "d1", thread_root_id: null, body: "Call the lender back", bot: null, sender_id: "andrew", remind_at: null, reminded_at: null, channel_kind: "dm", channel_name: null }] };
  if (url.startsWith("/api/templates")) return [];
  return {};
}

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string, opts?: any) => routeApi(url, opts));
  h.apiFn.post.mockImplementation(async (u: string, b: any) => { posted.push([u, b]); return { ok: true }; });
  h.apiFn.put.mockResolvedValue({});
  h.apiFn.delete.mockResolvedValue({ ok: true });
  h.startInternalCall.mockClear();
  FakeWS.last = null;
  vi.stubGlobal("WebSocket", FakeWS);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Team Phase C", () => {
  it("finds linked contacts and applications once each", () => {
    expect(cardRefs("https://staff.boreal.financial/crm/contacts/" + ID + " then /applications/" + ID + " and /crm/contacts/" + ID)).toEqual(["contact:" + ID, "application:" + ID]);
  });
  it("remind times", () => {
    const now = new Date("2026-09-28T15:00:00Z");
    expect(remindTime("20m", now)).toBe("2026-09-28T15:20:00.000Z");
    expect(remindTime("save", now)).toBeNull();
    expect(new Date(remindTime("tomorrow", now) as string).getHours()).toBe(9);
  });
  it("shows cards for links in a message", async () => {
    render(<MemoryRouter><TeamCards text={"Look at /applications/" + ID + " for /crm/contacts/" + ID} /></MemoryRouter>);
    await screen.findByText("Todd's Gym LOC");
    expect(screen.getAllByTestId("team-card")).toHaveLength(2);
  });
  it("saves with a reminder", async () => {
    render(<SaveMenu messageId="m1" />);
    fireEvent.click(screen.getByTestId("team-save"));
    fireEvent.click(screen.getByText("Remind me in 1 hour"));
    await waitFor(() => expect(posted.some(([u, b]) => u === "/api/team/messages/m1/save" && typeof b.remind_at === "string")).toBe(true));
    await screen.findByText("Reminder set");
  });
});

describe("Phase C in the Team tab, thread panel and alerts", () => {
  async function openDm() {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    fireEvent.click(await screen.findByText("Andrew"));
    await screen.findByText("Hi, Maya here");
  }

  it("Saved for later opens the saved list", async () => {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId("team-saved"));
    const panel = await screen.findByTestId("team-saved-panel");
    expect(await within(panel).findByText("Call the lender back")).toBeInTheDocument();
    expect(h.apiFn).toHaveBeenCalledWith("/api/team/saved");
  });

  it("a direct message has a call button that rings the other person", async () => {
    await openDm();
    fireEvent.click(screen.getByTestId("team-dm-call"));
    expect(h.startInternalCall).toHaveBeenCalledWith("andrew", { contactName: "Andrew" });
  });

  it("messages show linked cards, a Save menu, and a bot's name as the sender", async () => {
    await openDm();
    expect(await screen.findByText("Walter's Bakery LOC")).toBeInTheDocument();
    expect(screen.getAllByTestId("team-card")).toHaveLength(1);
    expect(screen.getByText("Lender Bot")).toBeInTheDocument();
    const saves = screen.getAllByTestId("team-save");
    expect(saves).toHaveLength(2);
    fireEvent.click(saves[0]!);
    fireEvent.click(screen.getByText("Save for later"));
    await waitFor(() => expect(posted).toContainEqual(["/api/team/messages/m1/save", { remind_at: null }]));
  });

  it("thread replies show linked cards too", async () => {
    h.apiFn.mockImplementation(async (url: string, opts?: any) => url === "/api/team/channels/d1/threads/r0"
      ? { root: { id: "r0", channel_id: "d1", sender_id: "andrew", body: "Contact /crm/contacts/" + ID, created_at: "2026-10-07T18:00:00Z" }, replies: [] }
      : routeApi(url, opts));
    render(<MemoryRouter><ThreadPanel channelId="d1" rootId="r0" nameOf={() => "Andrew"} memberNames={[]} myId="me" live={null} onClose={() => undefined} onSummary={() => undefined} /></MemoryRouter>);
    const panel = await screen.findByTestId("team-thread-panel");
    expect(await within(panel).findByText("Sam Lee")).toBeInTheDocument();
    expect(within(panel).getAllByTestId("team-save").length).toBeGreaterThan(0);
  });

  it("the notifier shows a Reminder banner when a saved reminder fires", async () => {
    render(<TeamNotifier />);
    await waitFor(() => expect(FakeWS.last).not.toBeNull());
    act(() => { FakeWS.last!.onmessage!({ data: JSON.stringify({ type: "reminder", channel_id: "d1", body: "Call the lender back" }) }); });
    const banner = await screen.findByTestId("team-notify-banner");
    expect(banner).toHaveTextContent("Reminder");
    expect(banner).toHaveTextContent("Call the lender back");
  });
});
