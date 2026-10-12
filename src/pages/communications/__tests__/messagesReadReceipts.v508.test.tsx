// BF_PORTAL_BLOCK_v508_MESSAGES_READ_RECEIPTS
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const READ_AT = "2026-06-09T15:30:00Z";

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
  h.apiFn.mockImplementation((url: string) => {
    const u = String(url);
    if (u === "/api/communications/messages-list") {
      return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", email: null, last_at: "2026-06-09T12:00:00Z", last_body: "Hi", unread_count: 0 }] });
    }
    if (u === "/api/communications/messages/thread") {
      return Promise.resolve([
        { id: "m1", body: "Client asks a question", senderType: "client", createdAt: "2026-06-09T10:00:00Z" },
        { id: "m2", body: "Staff reply not opened", senderType: "staff", senderName: "Todd", createdAt: "2026-06-09T11:00:00Z", readAt: null },
        { id: "m3", body: "Staff reply opened", source: "staff", senderName: "Todd", createdAt: "2026-06-09T12:00:00Z", readAt: READ_AT },
      ]);
    }
    if (u.endsWith("/applications")) return Promise.resolve([]);
    if (u === "/api/communications/messages/typing") return Promise.resolve({ typing: false, label: null });
    if (u === "/api/communications/sms") return Promise.resolve({ conversations: [] });
    if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
    if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
    if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
    return Promise.resolve({});
  });
});

function bubbleOf(text: string): HTMLElement {
  // Walk up from the body text to the nearest ancestor that also holds a delivery tag (or the thread root).
  let el: HTMLElement | null = screen.getByText(text);
  while (el && !el.querySelector("[data-testid='msg-delivery']") && el.parentElement) {
    const parent: HTMLElement = el.parentElement;
    // Stop before climbing into a container that holds more than one message.
    if (parent.querySelectorAll("[data-testid='msg-delivery']").length > 1) break;
    el = parent;
  }
  return el as HTMLElement;
}

describe("v508 read receipts on client Messages", () => {
  it("staff messages carry Delivered or Read; client messages carry neither", async () => {
    render(<CommunicationsPage initialTab="messages" />);
    expect(await screen.findByText("Staff reply opened")).toBeInTheDocument();

    const tags = screen.getAllByTestId("msg-delivery");
    // Only the two staff messages are tagged.
    expect(tags).toHaveLength(2);
    expect(tags[0]).toHaveTextContent(/^Delivered$/);
    expect(tags[1]).toHaveTextContent(/^Read /);

    const expectedRead = `Read ${new Date(READ_AT).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    expect(tags[1]).toHaveTextContent(expectedRead);

    expect(within(bubbleOf("Staff reply not opened")).getByTestId("msg-delivery")).toHaveTextContent("Delivered");
    expect(within(bubbleOf("Staff reply opened")).getByTestId("msg-delivery")).toHaveTextContent(expectedRead);
    expect(within(bubbleOf("Client asks a question")).queryByTestId("msg-delivery")).toBeNull();
  });
});
