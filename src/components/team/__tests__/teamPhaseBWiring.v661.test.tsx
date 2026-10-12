// BF_PORTAL_TEAM_PHASE_B_v661
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

const users = [{ id: "me", name: "Todd", email: null }, { id: "andrew", name: "Andrew", email: null }, { id: "caden", name: "Caden", email: null }];
const channels = [{ id: "c2", kind: "channel", name: "general", topic: "Everything", member_ids: ["me", "andrew", "caden"], unread_count: 0, last_message: null }];
const root = { id: "m1", channel_id: "c2", sender_id: "andrew", body: "**Big** news for @Caden", created_at: "2026-10-07T18:00:00Z", thread: { reply_count: 2, last_reply_at: null, participant_ids: [] } };
const plain = { id: "m2", channel_id: "c2", sender_id: "caden", body: "No replies yet", created_at: "2026-10-07T18:05:00Z" };
const reply = { id: "r1", channel_id: "c2", sender_id: "caden", body: "First reply here", created_at: "2026-10-07T18:01:00Z", thread_root_id: "m1" };

function routeApi(url: string): unknown {
  if (url === "/api/team/channels") return { channels };
  if (url === "/api/team/users") return { users };
  if (url === "/api/team/channels/c2/messages") return { messages: [root, plain] };
  if (url === "/api/team/channels/c2/threads/m1") return { root, replies: [reply] };
  if (url === "/api/team/channels/c2/threads/m2") return { root: plain, replies: [] };
  if (url === "/api/team/channels/browse") return { channels: [{ id: "c9", name: "lenders", topic: "Lender news", is_private: false, archived_at: null, member_count: 3, is_member: false }] };
  if (url === "/api/team/search") return { messages: [], channels: [] };
  if (url.startsWith("/api/templates")) return [];
  return {};
}

function renderTeam() {
  return render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
}
async function openGeneral() {
  renderTeam();
  fireEvent.click(await screen.findByText("# general"));
  await screen.findByText("Big");
}
function emit(data: unknown) {
  act(() => { FakeWS.last!.onmessage!({ data: JSON.stringify(data) }); });
}

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => routeApi(url));
  h.apiFn.post.mockImplementation(async (url: string, body: any) => url === "/api/team/channels/c2/messages" ? { message: { id: "new1", channel_id: "c2", sender_id: "me", body: body.body, created_at: "2026-10-07T19:00:00Z" } } : {});
  FakeWS.last = null;
  vi.stubGlobal("WebSocket", FakeWS);
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Team tab wiring", () => {
  it("Browse opens the channel browser", async () => {
    renderTeam();
    fireEvent.click(await screen.findByTestId("team-browse"));
    const browser = await screen.findByTestId("team-channel-browser");
    expect(await within(browser).findByText(/Lender news/)).toBeInTheDocument();
    expect(h.apiFn).toHaveBeenCalledWith("/api/team/channels/browse");
  });

  it("search everywhere opens Team search", async () => {
    renderTeam();
    fireEvent.click(await screen.findByTestId("team-search-all"));
    const panel = await screen.findByTestId("team-search");
    fireEvent.change(within(panel).getByLabelText("Search Team"), { target: { value: "walter" } });
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/team/search", { params: { q: "walter" } }));
  });

  it("channel details opens the settings for the open channel", async () => {
    await openGeneral();
    expect(screen.getByTestId("team-topic")).toHaveTextContent("Everything");
    fireEvent.click(screen.getByTestId("team-channel-details"));
    const settings = await screen.findByTestId("team-channel-settings");
    expect(within(settings).getByText("Channel details")).toBeInTheDocument();
    expect(within(settings).getByLabelText("Name")).toHaveValue("general");
  });

  it("messages are rendered with formatting and @mentions", async () => {
    await openGeneral();
    expect(screen.getByText("Big").tagName).toBe("STRONG");
    expect(screen.getByText("@Caden")).toHaveStyle({ fontWeight: "700" });
    expect(screen.queryByText("**Big** news for @Caden")).toBeNull();
  });

  it("the reply-count link opens the thread panel", async () => {
    await openGeneral();
    const link = screen.getByTestId("team-thread-link");
    expect(link).toHaveTextContent("2 replies");
    fireEvent.click(link);
    const panel = await screen.findByTestId("team-thread-panel");
    expect(await within(panel).findByText("First reply here")).toBeInTheDocument();
    expect(h.apiFn).toHaveBeenCalledWith("/api/team/channels/c2/threads/m1");
  });

  it("Reply in thread opens a thread on any message", async () => {
    await openGeneral();
    const buttons = screen.getAllByTestId("team-reply-thread");
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]!);
    await screen.findByTestId("team-thread-panel");
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/team/channels/c2/threads/m2"));
  });

  it("live thread replies update the reply count and the open thread", async () => {
    await openGeneral();
    fireEvent.click(screen.getByTestId("team-thread-link"));
    const panel = await screen.findByTestId("team-thread-panel");
    await within(panel).findByText("First reply here");
    await waitFor(() => expect(FakeWS.last).not.toBeNull());
    emit({ type: "thread_message", channel_id: "c2", root_id: "m1", message: { id: "r2", channel_id: "c2", sender_id: "andrew", body: "Live reply arrives", created_at: "2026-10-07T18:10:00Z", thread_root_id: "m1" }, summary: { reply_count: 3, last_reply_at: null, participant_ids: [] } });
    expect(await within(panel).findByText("Live reply arrives")).toBeInTheDocument();
    expect(screen.getByTestId("team-thread-link")).toHaveTextContent("3 replies");
    emit({ type: "thread_message", channel_id: "c2", root_id: "m2", message: { id: "r3", channel_id: "c2", sender_id: "me", body: "x", created_at: "2026-10-07T18:11:00Z", thread_root_id: "m2" }, summary: { reply_count: 1, last_reply_at: null, participant_ids: [] } });
    await waitFor(() => expect(screen.getAllByTestId("team-thread-link").map((b) => b.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("1 reply")])));
  });

  it("a ?channel=&thread= link opens the conversation with its thread", async () => {
    window.history.replaceState(null, "", "/communications?tab=team&channel=c2&thread=m1");
    renderTeam();
    const panel = await screen.findByTestId("team-thread-panel");
    expect(await within(panel).findByText("First reply here")).toBeInTheDocument();
  });

  it("the formatting bar formats the draft", async () => {
    await openGeneral();
    const draft = screen.getByTestId("team-draft") as HTMLTextAreaElement;
    fireEvent.change(draft, { target: { value: "hello" } });
    draft.setSelectionRange(0, 5);
    fireEvent.mouseDown(within(screen.getByTestId("team-format-bar")).getByLabelText("Bold"));
    expect(draft.value).toBe("**hello**");
  });

  it("the draft is a multi-line box: Shift+Enter adds a line, Enter sends", async () => {
    await openGeneral();
    const draft = screen.getByTestId("team-draft") as HTMLTextAreaElement;
    expect(draft.tagName).toBe("TEXTAREA");
    fireEvent.change(draft, { target: { value: "line one\nline two" } });
    expect(draft.rows).toBe(2);
    fireEvent.keyDown(draft, { key: "Enter", shiftKey: true });
    expect(h.apiFn.post).not.toHaveBeenCalledWith("/api/team/channels/c2/messages", expect.anything());
    fireEvent.keyDown(draft, { key: "Enter" });
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/team/channels/c2/messages", expect.objectContaining({ body: "line one\nline two" })));
  });
});
