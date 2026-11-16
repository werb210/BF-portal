// BF_PORTAL_v966_MEETING_CHAT
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  type Fn = (...a: any[]) => void;
  class Emitter { private l = new Map<string, Fn[]>(); on(e: string, f: Fn) { this.l.set(e, [...(this.l.get(e) ?? []), f]); } off() {} emit(e: string, ...a: any[]) { (this.l.get(e) ?? []).forEach((f) => f(...a)); } }
  class FakeCall extends Emitter {
    state = "Connected"; isMuted = false; remoteParticipants: any[] = []; info = { threadId: "19:meeting_abc@thread.v2" };
    mute = vi.fn(); unmute = vi.fn(); startVideo = vi.fn(); stopVideo = vi.fn(); hangUp = vi.fn(async () => { this.state = "Disconnected"; });
  }
  return { FakeCall, state: { call: null as FakeCall | null }, chatToken: vi.fn(), listChat: vi.fn(), sendChat: vi.fn() };
});
vi.mock("@azure/communication-common", () => ({ AzureCommunicationTokenCredential: class { dispose() {} } }));
vi.mock("@azure/communication-calling", () => {
  const agent = () => ({ join: () => { h.state.call = new h.FakeCall(); return h.state.call; }, dispose: async () => undefined });
  return {
    CallClient: class { async createTeamsCallAgent() { return agent(); } async createCallAgent() { return agent(); } async getDeviceManager() { return { askDevicePermission: async () => ({ audio: true, video: false }), getCameras: async () => [] }; } async dispose() {} },
    Features: {}, LocalVideoStream: class {}, VideoStreamRenderer: class { async createView() { return { target: document.createElement("div") }; } dispose() {} },
  };
});
vi.mock("../meetingChat", async (orig) => ({ ...(await orig<Record<string, unknown>>()), chatToken: h.chatToken, listChat: h.listChat, sendChat: h.sendChat }));
vi.mock("@/auth/msal", () => ({ msalClient: {} }));

import TeamsMeetingCall from "../TeamsMeetingCall";
const real = await vi.importActual<typeof import("../meetingChat")>("../meetingChat");
const { CHAT_SCOPES, chatToken, listChat, plainText, sendChat, toMessages } = real;

const OID = "44444444-4444-4444-8444-444444444444";
const ticket = { token: "t", acsUserId: "teams:" + OID, displayName: "Alex Tester", joinUrl: "https://teams.microsoft.com/meet/123?p=x", identity: "teams" as const };
const msg = (id: string, from: string, text: string, mine = false) => ({ id, from, text, at: "2030-01-01T00:00:0" + id + "Z", mine });

beforeEach(() => { h.state.call = null; h.chatToken.mockReset(); h.listChat.mockReset(); h.sendChat.mockReset(); });

async function open(t = ticket) {
  render(<TeamsMeetingCall ticket={t} onEnded={() => undefined} />);
  await waitFor(() => expect(h.state.call).not.toBeNull());
  act(() => { h.state.call!.emit("stateChanged"); });
  await waitFor(() => expect(screen.getByTestId("meeting-bar")).toBeInTheDocument());
}

describe("meeting chat in the portal", () => {
  it("opens the meeting's Teams chat, shows messages and sends one", async () => {
    h.chatToken.mockResolvedValue({ token: "graph-token" });
    h.listChat.mockResolvedValue([msg("1", "Sam Example", "Hello")]);
    h.sendChat.mockResolvedValue(undefined);
    await open();
    await waitFor(() => expect(screen.getByTestId("meeting-chat-button")).toHaveTextContent("Chat (1 new)"));
    fireEvent.click(screen.getByTestId("meeting-chat-button"));
    expect(await screen.findByTestId("meeting-chat-message")).toHaveTextContent("Sam Example");
    expect(h.listChat).toHaveBeenCalledWith("19:meeting_abc@thread.v2", "graph-token", OID);
    expect(screen.getByTestId("meeting-chat-button")).toHaveTextContent(/^Chat$/);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "  Thanks all  " } });
    h.listChat.mockResolvedValue([msg("1", "Sam Example", "Hello"), msg("2", "Alex Tester", "Thanks all", true)]);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(h.sendChat).toHaveBeenCalledWith("19:meeting_abc@thread.v2", "graph-token", "Thanks all"));
    await waitFor(() => expect(screen.getAllByTestId("meeting-chat-message")).toHaveLength(2));
  });

  it("says so when Microsoft will not open the chat, and guests get no Chat button", async () => {
    h.chatToken.mockResolvedValue({ error: "consent_required" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await open();
    fireEvent.click(screen.getByTestId("meeting-chat-button"));
    expect(await screen.findByTestId("meeting-chat-blocked")).toBeInTheDocument();
    expect(h.chatToken).toHaveBeenCalledWith(true);
    warn.mockRestore();
  });

  it("a guest has no Chat button", async () => {
    await open({ ...ticket, identity: "guest" as any });
    expect(screen.queryByTestId("meeting-chat-button")).toBeNull();
  });
});

describe("meeting chat plumbing", () => {
  it("asks Microsoft silently first, then with a window only when asked to", async () => {
    const popup = vi.fn(async () => ({ accessToken: "p" }));
    const ok = { getActiveAccount: () => ({ a: 1 }), getAllAccounts: () => [], acquireTokenSilent: vi.fn(async () => ({ accessToken: "s" })), acquireTokenPopup: popup };
    expect(await chatToken(false, ok)).toEqual({ token: "s" });
    expect(ok.acquireTokenSilent).toHaveBeenCalledWith({ account: { a: 1 }, scopes: CHAT_SCOPES });
    const needs = { ...ok, acquireTokenSilent: async () => { throw Object.assign(new Error("x"), { errorCode: "consent_required" }); } };
    expect(await chatToken(false, needs)).toEqual({ error: "consent_required" });
    expect(await chatToken(true, needs)).toEqual({ token: "p" });
  });

  it("turns Teams' messages into plain, oldest-first text and posts plain text", async () => {
    expect(plainText("<p>Hi&nbsp;there</p><p>A &amp; B<br>ok</p>")).toBe("Hi there\nA & B\nok");
    const rows = [
      { id: "2", messageType: "message", createdDateTime: "2030-01-01T00:00:02Z", from: { user: { id: OID.toUpperCase(), displayName: "Alex" } }, body: { content: "<p>second</p>" } },
      { id: "x", messageType: "systemEventMessage", createdDateTime: "2030-01-01T00:00:01Z", body: { content: "<systemEventMessage/>" } },
      { id: "1", messageType: "message", createdDateTime: "2030-01-01T00:00:00Z", from: { user: { id: "other", displayName: "Sam" } }, body: { content: "first" } },
    ];
    expect(toMessages(rows, OID).map((m) => [m.from, m.text, m.mine])).toEqual([["Sam", "first", false], ["Alex", "second", true]]);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ value: rows }), { status: 200 })) as any;
    expect(await listChat("19:a@thread.v2", "tok", OID, fetcher)).toHaveLength(2);
    expect(fetcher.mock.calls[0][0]).toBe("https://graph.microsoft.com/v1.0/chats/19%3Aa%40thread.v2/messages?$top=40");
    const post = vi.fn(async () => new Response("{}", { status: 201 })) as any;
    await sendChat("19:a@thread.v2", "tok", " hello ", post);
    expect(JSON.parse(post.mock.calls[0][1].body)).toEqual({ body: { contentType: "text", content: "hello" } });
    await expect(sendChat("19:a@thread.v2", "tok", "x", (async () => new Response("", { status: 403 })) as any)).rejects.toThrow("chat_send_403");
  });
});
