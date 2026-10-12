// BF_PORTAL_BLOCK_v502_EMOJI_PICKER
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/lib/authToken", async (orig) => ({ ...(await orig<Record<string, unknown>>()), getAuthToken: () => "x." + btoa(JSON.stringify({ sub: "me" })) + ".y" }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/components/team/TeamNotifier", () => ({ setViewingTeamChannel: vi.fn() }));
vi.mock("@/hooks/usePushRegistration", () => ({ registerExistingPushPermission: vi.fn(async () => undefined) }));

import EmojiPicker, { EMOJIS } from "../EmojiPicker";
import O365ComposeModal from "../O365ComposeModal";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";

const ROCKET = "\u{1F680}";
const conversation = { contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", last_at: "2026-06-09T12:00:00Z", last_body: "Hi", unread_count: 0 };

function routeApi(url: string): unknown {
  if (url === "/api/communications/sms" || url === "/api/communications/messages-list") return { conversations: [conversation] };
  if (url.includes("/thread")) return { messages: [] };
  if (url === "/api/crm/contacts" || url.startsWith("/api/crm/contacts?")) return [];
  if (url.includes("/api/crm/contacts/") && url.endsWith("/applications")) return [];
  if (url === "/api/team/channels") return { channels: [{ id: "c1", kind: "channel", name: "general", member_ids: ["me"], unread_count: 0, last_message: null }] };
  if (url === "/api/team/users") return { users: [{ id: "me", name: "Todd", email: null }] };
  if (url === "/api/team/channels/c1/messages") return { messages: [] };
  if (url === "/api/o365/mail/drafts") return { items: [] };
  if (url === "/api/crm/shared-mailboxes") return { mine: { address: "todd@boreal.test", display_name: "Todd" }, shared: [] };
  if (url.startsWith("/api/templates") || url === "/api/collateral") return [];
  return {};
}

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => routeApi(url));
  h.apiFn.post.mockResolvedValue({});
  vi.stubGlobal("WebSocket", class { close() { /* noop */ } });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("v502 emoji picker", () => {
  it("opens, inserts the picked emoji and closes", () => {
    const onPick = vi.fn();
    render(createElement(EmojiPicker, { onPick }));
    fireEvent.mouseDown(screen.getByTestId("emoji-picker-button"));
    expect(screen.getByTestId("emoji-picker-panel")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText(`Insert ${EMOJIS[10]}`));
    expect(onPick).toHaveBeenCalledWith(EMOJIS[10]);
    expect(screen.queryByTestId("emoji-picker-panel")).toBeNull();
  });
});

describe("v502 emoji picker is on all four composers", () => {
  it("SMS: the picked emoji is appended to the draft", async () => {
    render(<CommunicationsPage initialTab="sms" />);
    fireEvent.click((await screen.findAllByText("Jordan Lee"))[0]!);
    const draft = await screen.findByPlaceholderText("Text message");
    fireEvent.change(draft, { target: { value: "Hi " } });
    fireEvent.mouseDown(screen.getByTestId("emoji-picker-button"));
    fireEvent.mouseDown(screen.getByLabelText(`Insert ${EMOJIS[10]}`));
    expect(draft).toHaveValue("Hi " + EMOJIS[10]);
  });

  it("Messages: the picked emoji is appended to the draft", async () => {
    render(<CommunicationsPage initialTab="messages" />);
    fireEvent.click((await screen.findAllByText("Jordan Lee"))[0]!);
    const draft = await screen.findByPlaceholderText(/Message the client/);
    fireEvent.change(draft, { target: { value: "Thanks " } });
    fireEvent.mouseDown(screen.getByTestId("emoji-picker-button"));
    fireEvent.mouseDown(screen.getByLabelText(`Insert ${EMOJIS[0]}`));
    expect(draft).toHaveValue("Thanks " + EMOJIS[0]);
  });

  it("Team: the composer uses the full picker (search by name) and appends to the draft", async () => {
    render(<MemoryRouter><CommunicationsPage initialTab="team" /></MemoryRouter>);
    fireEvent.click(await screen.findByText("# general"));
    const draft = await screen.findByTestId("team-draft");
    fireEvent.change(draft, { target: { value: "Launch " } });
    expect(screen.queryByTestId("emoji-picker-button")).toBeNull();
    fireEvent.mouseDown(screen.getByLabelText("Emoji"));
    const panel = await screen.findByTestId("team-emoji-panel");
    fireEvent.change(within(panel).getByLabelText("Search emoji"), { target: { value: "rocket" } });
    fireEvent.mouseDown(within(panel).getByLabelText("rocket"));
    await waitFor(() => expect(draft).toHaveValue("Launch " + ROCKET));
  });

  it("Email: the picked emoji is typed at the caret in the rich editor", async () => {
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true, writable: true });
    render(createElement(O365ComposeModal, { open: true, onClose: () => undefined }));
    fireEvent.mouseDown(screen.getByTestId("emoji-picker-button"));
    fireEvent.mouseDown(screen.getByLabelText(`Insert ${EMOJIS[5]}`));
    expect(exec).toHaveBeenCalledWith("insertText", false, EMOJIS[5]);
    expect(screen.queryByTestId("emoji-picker-panel")).toBeNull();
  });
});
