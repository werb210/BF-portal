// BF_PORTAL_v895_KS_INBOX - the Keystone inbox lists only Keystone's shared mailboxes, never your own.
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => Promise<unknown>) => call(), withO365Refresh: (call: () => Promise<unknown>) => call() }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
vi.mock("@/auth/msal", () => ({ ensureO365Scopes: vi.fn(async () => true), msalClient: {} }));

import { KsSharedInbox } from "../CommunicationsPage";

const inboxCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  inboxCalls.length = 0;
  h.apiFn.mockReset();
  h.apiFn.mockImplementation((url: string, opts?: { params?: Record<string, unknown> }) => {
    if (url === "/api/crm/shared-mailboxes") {
      return Promise.resolve({
        mine: { address: "staff@example.test", display_name: "Staff Person" },
        shared: [{ address: "sales@keystone.example.test", display_name: "Keystone Sales" }, { address: "support@keystone.example.test", display_name: "Keystone Support" }],
      });
    }
    if (url === "/api/crm/inbox") { inboxCalls.push(opts?.params ?? {}); return Promise.resolve([]); }
    if (String(url).startsWith("/api/crm/inbox")) return Promise.resolve([]);
    return Promise.resolve({});
  });
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Keystone inbox", () => {
  it("offers only the Keystone shared mailboxes and never reads your own mailbox", async () => {
    render(<MemoryRouter><KsSharedInbox /></MemoryRouter>);
    await screen.findByRole("option", { name: /Keystone Sales/ });
    expect(screen.getByRole("option", { name: /Keystone Support/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /\(mine\)/ })).toBeNull();
    await waitFor(() => expect(inboxCalls.length).toBeGreaterThan(0));
    for (const p of inboxCalls) expect(p.mailbox).toMatch(/@keystone\.example\.test$/);
  });
});
