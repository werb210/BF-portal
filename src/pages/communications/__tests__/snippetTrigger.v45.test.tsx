// BF_PORTAL_SNIPPET_TRIGGER_v45 - v44 shipped the expansion hook and nothing
// called it, so typing "#pnw" did nothing at all.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: (_scopes: unknown, call: () => Promise<unknown>) => call(),
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));

import CommunicationsPage from "../CommunicationsPage";
import O365ComposeModal from "@/components/communications/O365ComposeModal";

const SNIPPET_BODY = "Please send your personal net worth statement.";

function routeApi(url: string): Promise<unknown> {
  const u = String(url);
  // Only the channel-agnostic list (no channel= filter) holds the snippet, so an
  // expansion below proves the composer asked for that list.
  if (u === "/api/templates?snippets=1") return Promise.resolve({ items: [{ id: "s1", name: "PNW", shortcut: "pnw", body_text: SNIPPET_BODY }] });
  if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
  if (u === "/api/communications/sms") {
    return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", last_at: new Date().toISOString(), last_body: "hi" }] });
  }
  if (u === "/api/communications/sms/thread") return Promise.resolve({ messages: [] });
  if (u === "/api/communications/messages-list") {
    return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", email: null, last_at: "2026-06-09T12:00:00Z", last_body: "Hi", unread_count: 0 }] });
  }
  if (u === "/api/communications/messages/thread") return Promise.resolve([]);
  if (u.endsWith("/applications")) return Promise.resolve([]);
  if (u === "/api/communications/messages/typing") return Promise.resolve({ typing: false, label: null });
  if (u === "/api/team/channels") return Promise.resolve({ channels: [{ id: "ch1", kind: "channel", name: "general", dm_key: null, created_by: null, created_at: "2026-06-01T00:00:00Z", member_ids: [], last_read_at: null, last_message: null, unread_count: 0 }] });
  if (u === "/api/team/users") return Promise.resolve({ users: [] });
  if (u === "/api/team/channels/ch1/messages") return Promise.resolve({ messages: [] });
  if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
  if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
  if (u === "/api/collateral") return Promise.resolve([]);
  return Promise.resolve({});
}

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.patch.mockReset();
  h.apiFn.mockImplementation(routeApi);
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function snippetsLoaded() {
  await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/templates?snippets=1"));
  await act(async () => { await Promise.resolve(); });
}

function postsTo(url: string) {
  return h.apiFn.post.mock.calls.filter((c: unknown[]) => c[0] === url);
}

describe("the trigger is attached", () => {
  it("SMS: '#pnw' + Enter expands in place and does not send; the next Enter sends", async () => {
    render(<CommunicationsPage initialTab="sms" />);
    const box = (await screen.findByPlaceholderText("Text message")) as HTMLTextAreaElement;
    await snippetsLoaded();

    fireEvent.change(box, { target: { value: "#pnw" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(box.value).toBe(SNIPPET_BODY));
    expect(postsTo("/api/communications/sms")).toHaveLength(0);

    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(postsTo("/api/communications/sms")).toHaveLength(1));
    expect(postsTo("/api/communications/sms")[0]?.[1]).toEqual(expect.objectContaining({ body: SNIPPET_BODY }));
  });

  it("SMS: space after a shortcut expands too", async () => {
    render(<CommunicationsPage initialTab="sms" />);
    const box = (await screen.findByPlaceholderText("Text message")) as HTMLTextAreaElement;
    await snippetsLoaded();
    fireEvent.change(box, { target: { value: "Hi #pnw" } });
    fireEvent.keyDown(box, { key: " " });
    await waitFor(() => expect(box.value).toBe(`Hi ${SNIPPET_BODY}`));
  });

  it("Messages: '#pnw' + Ctrl+Enter expands and does not send; the next Ctrl+Enter sends", async () => {
    render(<CommunicationsPage initialTab="messages" />);
    const box = (await screen.findByPlaceholderText(/^Message the client/)) as HTMLTextAreaElement;
    await snippetsLoaded();

    fireEvent.change(box, { target: { value: "#pnw" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(box.value).toBe(SNIPPET_BODY));
    expect(postsTo("/api/communications/messages/send")).toHaveLength(0);

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(postsTo("/api/communications/messages/send")).toHaveLength(1));
    expect(postsTo("/api/communications/messages/send")[0]?.[1]).toEqual(expect.objectContaining({ contactId: "c-1", body: SNIPPET_BODY }));
  });

  it("Team: '#pnw' + Enter expands and does not send; the next Enter sends", async () => {
    window.history.replaceState(null, "", "/communications?tab=team&channel=ch1");
    render(<CommunicationsPage />);
    const box = (await screen.findByTestId("team-draft")) as HTMLTextAreaElement;
    await snippetsLoaded();

    fireEvent.change(box, { target: { value: "#pnw" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(box.value).toBe(SNIPPET_BODY));
    expect(postsTo("/api/team/channels/ch1/messages")).toHaveLength(0);

    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(postsTo("/api/team/channels/ch1/messages")).toHaveLength(1));
    expect(postsTo("/api/team/channels/ch1/messages")[0]?.[1]).toEqual(expect.objectContaining({ body: SNIPPET_BODY }));
  });
});

describe("the email composer is deliberately excluded", () => {
  it("expands through its own contentEditable path, not the textarea hook", async () => {
    const execCommand = vi.fn(() => true);
    const original = document.execCommand;
    document.execCommand = execCommand as unknown as typeof document.execCommand;
    try {
      render(<O365ComposeModal open onClose={() => undefined} />);
      await snippetsLoaded();
      const body = document.querySelector("[contenteditable]") as HTMLElement;
      expect(body).toBeTruthy();

      // Ordinary typing is left alone.
      body.textContent = "hello";
      const plainText = body.firstChild as Text;
      const sel = window.getSelection();
      const r1 = document.createRange();
      r1.setStart(plainText, 5); r1.collapse(true);
      sel?.removeAllRanges(); sel?.addRange(r1);
      expect(fireEvent.keyDown(body, { key: " " })).toBe(true);
      expect(execCommand).not.toHaveBeenCalled();

      // A shortcut before the caret is replaced with the escaped snippet text.
      body.textContent = "#pnw";
      const shortcutText = body.firstChild as Text;
      const r2 = document.createRange();
      r2.setStart(shortcutText, 4); r2.collapse(true);
      sel?.removeAllRanges(); sel?.addRange(r2);
      expect(fireEvent.keyDown(body, { key: " " })).toBe(false);
      expect(execCommand).toHaveBeenCalledWith("insertHTML", false, SNIPPET_BODY);
    } finally {
      document.execCommand = original;
    }
  });
});
