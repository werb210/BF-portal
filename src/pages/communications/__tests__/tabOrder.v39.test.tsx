// BF_PORTAL_COMMS_TABS_v39 - the tab that opens on arrival should be the one
// staff start in, while valid deep-linked tab parameters may override the
// default. Inbox remains the fallback and first configured tab.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { render, screen, waitFor } from "@testing-library/react";
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

let sharedMailboxes: unknown = { mine: null, shared: [] };

function routeApi(url: string): Promise<unknown> {
  const u = String(url);
  if (u === "/api/crm/shared-mailboxes") return Promise.resolve(sharedMailboxes);
  if (u === "/api/communications/sms" || u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
  if (u.startsWith("/api/crm/contacts")) return Promise.resolve([]);
  if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
  if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
  if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
  return Promise.resolve({});
}

function tabButtons(container: HTMLElement): HTMLButtonElement[] {
  const nav = container.firstElementChild?.firstElementChild;
  return Array.from(nav?.querySelectorAll(":scope > button") ?? []) as HTMLButtonElement[];
}

function activeTab(container: HTMLElement): string | null {
  const active = tabButtons(container).find((b) => b.style.fontWeight === "700");
  return active?.textContent ?? null;
}

beforeEach(() => {
  sharedMailboxes = { mine: null, shared: [] };
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.mockImplementation(routeApi);
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("communications tab order", () => {
  it("reads Inbox, SMS, Messages, Team, Phone, Issues, Maya - all seven tabs", () => {
    const { container } = render(<CommunicationsPage />);
    expect(tabButtons(container).map((b) => b.textContent)).toEqual([
      "Inbox",
      "SMS",
      "Messages",
      "Team",
      "Phone",
      "Issues",
      "Maya",
    ]);
  });

  it("opens on Inbox when nothing asks for another tab", async () => {
    const { container } = render(<CommunicationsPage />);
    expect(activeTab(container)).toBe("Inbox");
    expect(screen.getByRole("button", { name: "+ Compose" })).toBeInTheDocument();
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/shared-mailboxes"));
  });

  it("opens a valid ?tab= deep link", async () => {
    window.history.replaceState(null, "", "/communications?tab=sms");
    const { container } = render(<CommunicationsPage />);
    expect(activeTab(container)).toBe("SMS");
    expect(await screen.findByText(/No CRM contacts with phone numbers yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Compose" })).not.toBeInTheDocument();
  });

  it("falls back to Inbox for an unknown ?tab= value", () => {
    window.history.replaceState(null, "", "/communications?tab=bogus");
    const { container } = render(<CommunicationsPage />);
    expect(activeTab(container)).toBe("Inbox");
    expect(screen.getByRole("button", { name: "+ Compose" })).toBeInTheDocument();
  });

  it("an explicit initialTab wins over the URL tab", async () => {
    window.history.replaceState(null, "", "/communications?tab=inbox");
    const { container } = render(<CommunicationsPage initialTab="sms" />);
    expect(activeTab(container)).toBe("SMS");
    expect(await screen.findByText(/No CRM contacts with phone numbers yet/i)).toBeInTheDocument();
  });
});

describe("InboxTab survives a malformed mailbox response", () => {
  it("does not blank the tab when the response has no shared list", async () => {
    sharedMailboxes = { mine: { address: "me@boreal.financial", display_name: "Me" } };
    render(<CommunicationsPage />);
    // mine present -> the unified All Mailboxes view is chosen and loads my mailbox.
    expect(await screen.findByRole("option", { name: "All Mailboxes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Me (mine)" })).toBeInTheDocument();
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/inbox", expect.objectContaining({ params: expect.objectContaining({ folder: "inbox" }) })));
    expect(screen.queryByText("Could not load Microsoft 365 mailboxes.")).not.toBeInTheDocument();
  });

  it("treats a non-array shared value as no shared mailboxes", async () => {
    sharedMailboxes = { mine: null, shared: "not-a-list" };
    render(<CommunicationsPage />);
    // The list reloads once the mailbox list arrives, so check the settled state.
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/shared-mailboxes"));
    await waitFor(() => expect(screen.getByText("Nothing in this inbox.")).toBeInTheDocument());
    expect(screen.queryByText("Could not load Microsoft 365 mailboxes.")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "All Mailboxes" })).not.toBeInTheDocument();
  });

  it("survives a null body", async () => {
    sharedMailboxes = null;
    render(<CommunicationsPage />);
    // The list reloads once the mailbox list arrives, so check the settled state.
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/shared-mailboxes"));
    await waitFor(() => expect(screen.getByText("Nothing in this inbox.")).toBeInTheDocument());
    expect(screen.queryByText("Could not load Microsoft 365 mailboxes.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Compose" })).toBeInTheDocument();
  });
});
