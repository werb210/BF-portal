// BF_PORTAL_TEAM_NOTIFY_v644 (Team tab - shipped as v645)
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn, setViewing: vi.fn(), registerPush: vi.fn(async () => undefined) };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/lib/authToken", async (orig) => ({ ...(await orig<Record<string, unknown>>()), getAuthToken: () => "x." + btoa(JSON.stringify({ sub: "me" })) + ".y" }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => "ws://test/api/team/ws?token=t"), getUrlTicket: vi.fn(async () => "t") }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/components/team/TeamNotifier", () => ({ setViewingTeamChannel: h.setViewing }));
vi.mock("@/hooks/usePushRegistration", () => ({ registerExistingPushPermission: h.registerPush }));
vi.mock("@/dialer/actions", () => ({ startInternalCall: vi.fn(), startOutboundPstn: vi.fn() }));

import CommunicationsPage, { statusUntil, TeamStatusEditor } from "@/pages/communications/CommunicationsPage";

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

const users = [{ id: "me", name: "Todd", email: null }, { id: "andrew", name: "Andrew", email: null }];
const channels = [
  { id: "c1", kind: "dm", name: null, member_ids: ["me", "andrew"], unread_count: 0, muted: false, last_message: null },
];
const messages = [{ id: "m1", channel_id: "c1", sender_id: "andrew", body: "Walter paid", created_at: "2026-10-07T18:00:00Z" }];

function routeApi(url: string): unknown {
  if (url === "/api/team/channels") return { channels };
  if (url === "/api/team/users") return { users };
  if (url === "/api/team/statuses") return { statuses: [{ user_id: "andrew", status_text: "At lender meeting", status_emoji: null, status_until: null, dnd: false, dnd_until: null, away: false }] };
  if (url === "/api/team/presence") return { presence: [{ user_id: "andrew", status: "available" }] };
  if (url === "/api/team/channels/c1/messages") return { messages };
  if (url.startsWith("/api/templates")) return [];
  return {};
}

function renderTeam() {
  return render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
}

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => routeApi(url));
  h.apiFn.post.mockResolvedValue({});
  h.apiFn.put.mockImplementation(async (_url: string, body: any) => ({ status: { user_id: "me", ...body, dnd: Boolean(body.dnd_until), away: false } }));
  h.setViewing.mockReset();
  h.registerPush.mockClear();
  vi.stubGlobal("WebSocket", FakeWS);
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("status", () => {
  it("clear-after times", () => {
    const now = new Date(2026, 8, 28, 14, 30, 0);
    expect(new Date(statusUntil("1h", now)!).getTime() - now.getTime()).toBe(3600_000);
    const t8 = new Date(statusUntil("tomorrow8", now)!);
    expect([t8.getDate(), t8.getHours(), t8.getMinutes()]).toEqual([29, 8, 0]);
    expect(statusUntil("never", now)).toBeNull();
  });
  it("a preset fills the status and Save sends it", async () => {
    const done = vi.fn();
    render(<TeamStatusEditor onDone={done} />);
    fireEvent.click(screen.getByText(/At lender meeting/));
    fireEvent.change(screen.getByLabelText("Do Not Disturb"), { target: { value: "1h" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(h.apiFn.put).toHaveBeenCalledWith("/api/team/status", expect.anything());
    const body = (h.apiFn.put.mock.calls[0] as unknown as any[])[1];
    expect(body.status_text).toBe("At lender meeting");
    expect(typeof body.dnd_until).toBe("string");
  });
});

describe("wiring", () => {
  it("the Team tab loads presence dots and statuses at once", async () => {
    renderTeam();
    // Before any conversation is opened (and long before the 8 s / 30 s refresh).
    await waitFor(() => {
      expect(h.apiFn).toHaveBeenCalledWith("/api/team/presence");
      expect(h.apiFn).toHaveBeenCalledWith("/api/team/statuses");
    });
    expect(await screen.findByTestId("team-row-status")).toHaveTextContent("At lender meeting");
    expect(screen.getByLabelText("available")).toBeInTheDocument();
  });

  it("reports the open conversation to the notifier and clears it on leave", async () => {
    const view = renderTeam();
    fireEvent.click(await screen.findByText("Andrew"));
    await waitFor(() => expect(h.setViewing).toHaveBeenLastCalledWith("c1"));
    view.unmount();
    expect(h.setViewing).toHaveBeenLastCalledWith(null);
  });

  it("a notification link (?channel=) opens that conversation", async () => {
    window.history.replaceState(null, "", "/communications?tab=team&channel=c1");
    renderTeam();
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/team/channels/c1/messages"));
    expect(await screen.findByText("Walter paid")).toBeInTheDocument();
    expect(h.setViewing).toHaveBeenCalledWith("c1");
  });

  it("offers notifications when the browser has not been asked yet", async () => {
    const requestPermission = vi.fn(async () => "granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    renderTeam();
    const prompt = await screen.findByTestId("team-notify-prompt");
    expect(prompt).toHaveTextContent("Get alerts for new team messages");
    await act(async () => { fireEvent.click(screen.getByText("Turn on")); });
    expect(requestPermission).toHaveBeenCalled();
    await waitFor(() => expect(h.registerPush).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId("team-notify-prompt")).toBeNull());
  });

  it("does not nag when notifications are already decided", async () => {
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn() });
    renderTeam();
    await screen.findByText("Andrew");
    expect(screen.queryByTestId("team-notify-prompt")).toBeNull();
  });

  it("mutes a conversation", async () => {
    renderTeam();
    await screen.findByText("Andrew");
    fireEvent.click(screen.getByTestId("team-mute-toggle"));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/team/channels/c1/mute", { muted: true }));
    expect(screen.getByTestId("team-mute-toggle")).toHaveAttribute("title", "Unmute (alerts for everything)");
  });

  it("marks a conversation unread from a message", async () => {
    renderTeam();
    fireEvent.click(await screen.findByText("Andrew"));
    await screen.findByText("Walter paid");
    fireEvent.click(screen.getByTestId("team-mark-unread"));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/team/channels/c1/unread", { message_id: "m1" }));
    expect(await screen.findByText("Select a conversation")).toBeInTheDocument();
  });
});
