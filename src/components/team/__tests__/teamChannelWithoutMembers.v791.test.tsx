// BF_PORTAL_v791 - the Team tab renders and works when a channel row has no member_ids.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) { /* noop */ }
  close() { /* noop */ }
  send() { /* noop */ }
}

const users = [{ id: "me", name: "Todd", email: null }, { id: "andrew", name: "Andrew", email: null }];
// One channel with member_ids missing entirely, one DM and one group with member_ids null.
const channels = [
  { id: "c1", kind: "channel", name: "ops", topic: "Operations", unread_count: 0, last_message: null },
  { id: "d1", kind: "dm", name: null, member_ids: null, unread_count: 0, last_message: null },
  { id: "g1", kind: "group", name: null, member_ids: null, unread_count: 0, last_message: null },
];
const msg = { id: "m1", channel_id: "c1", sender_id: "andrew", body: "Morning team", created_at: "2026-10-12T15:00:00Z" };

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => {
    if (url === "/api/team/channels") return { channels };
    if (url === "/api/team/users") return { users };
    if (url === "/api/team/channels/c1/messages") return { messages: [msg] };
    if (url.startsWith("/api/team/channels/") && url.endsWith("/messages")) return { messages: [] };
    if (url.startsWith("/api/templates")) return [];
    return {};
  });
  h.apiFn.post.mockImplementation(async () => ({}));
  vi.stubGlobal("WebSocket", FakeWS);
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Team tab with channels lacking member_ids", () => {
  it("lists the channel, opens it, shows its messages and its details", async () => {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    fireEvent.click(await screen.findByText("# ops"));
    expect(await screen.findByText("Morning team")).toBeTruthy();

    fireEvent.click(screen.getByTestId("team-channel-details"));
    const panel = await screen.findByTestId("team-channel-settings");
    expect(within(panel).getByText("Members (0)")).toBeTruthy();
  });

  it("opens a DM whose member_ids is null without crashing", async () => {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    await screen.findByText("# ops");
    const dmRows = screen.getAllByText("Direct message");
    expect(dmRows.length).toBe(2); // the DM and the unnamed group both fall back to a label
    fireEvent.click(dmRows[0]!);
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/team/channels/d1/messages"));
    // No other member is known, so no call button is offered, and the pane still renders.
    expect(screen.queryByTestId("team-dm-call")).toBeNull();
    expect(screen.getAllByText("Direct message").length).toBeGreaterThan(1);
  });
});
