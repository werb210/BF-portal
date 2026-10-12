// BF_PORTAL_v791 - an email opened before the mailbox list finishes loading stays open.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const RECEIVED = "2026-10-12T14:05:00Z";
const hello = { id: "m1", subject: "Hello", bodyPreview: "Hi there", from: { emailAddress: { address: "info@boreal.financial", name: "Boreal Info" } }, receivedDateTime: RECEIVED, isRead: true };
const other = { id: "m2", subject: "Other note", bodyPreview: "Second", from: { emailAddress: { address: "ops@boreal.financial", name: "Ops" } }, receivedDateTime: RECEIVED, isRead: true };

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

let mailboxes: Deferred<unknown>;
let sharedList: Deferred<unknown>;

beforeEach(() => {
  mailboxes = deferred();
  sharedList = deferred();
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
  h.apiFn.mockImplementation((url: string, opts?: { params?: { mailbox?: string } }) => {
    const u = String(url);
    if (u === "/api/crm/shared-mailboxes") return mailboxes.promise;
    if (u === "/api/crm/inbox") {
      if (opts?.params?.mailbox === "shared@boreal.financial") return sharedList.promise;
      return Promise.resolve([hello, other]);
    }
    if (u === "/api/crm/inbox/m1") {
      return Promise.resolve({ subject: "Hello", from: hello.from, toRecipients: [], ccRecipients: [], body: { content: "<p>Opened body text</p>", contentType: "html" }, receivedDateTime: RECEIVED });
    }
    if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
    if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
    if (u === "/api/collateral") return Promise.resolve([]);
    if (u === "/api/communications/sms" || u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
    if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
    if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
    return Promise.resolve({});
  });
});

async function flush() {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

describe("inbox selection while the mailbox list loads", () => {
  it("keeps an email opened before the mailbox list arrives", async () => {
    render(<CommunicationsPage initialTab="inbox" />);
    fireEvent.click(await screen.findByText("Hello"));
    expect(await screen.findByText("Opened body text")).toBeTruthy();

    // The mailbox list arrives and the inbox reloads as "All Mailboxes".
    await act(async () => { mailboxes.resolve({ mine: { address: "todd@boreal.financial", display_name: "Todd" }, shared: [{ address: "shared@boreal.financial", display_name: "Shared" }] }); });
    await flush();
    // Selected while the merged list is still loading; the email stays open.
    expect(screen.getByText("Opened body text")).toBeTruthy();

    await act(async () => { sharedList.resolve([]); });
    await flush();
    await waitFor(() => expect(screen.getAllByText("Todd (mine)").length).toBeGreaterThan(0));
    expect(screen.getByText("Opened body text")).toBeTruthy();
    const rows = screen.getAllByText("Hello").map((el) => el.closest("button")).filter((b): b is HTMLButtonElement => Boolean(b));
    expect(rows.some((b) => b.style.background !== "" && b.style.background !== "transparent")).toBe(true);
  });

  it("keeps an email picked while the reloaded list is still pending, even if the list lacks it", async () => {
    h.apiFn.mockImplementation((url: string, opts?: { params?: { mailbox?: string } }) => {
      const u = String(url);
      if (u === "/api/crm/shared-mailboxes") return mailboxes.promise;
      if (u === "/api/crm/inbox") {
        // Only the first (default mailbox) load returns the email; the merged load is deferred.
        if (opts?.params?.mailbox === "shared@boreal.financial") return sharedList.promise;
        return Promise.resolve(h.apiFn.mock.calls.filter((c: unknown[]) => c[0] === "/api/crm/inbox").length > 1 ? [other] : [hello, other]);
      }
      if (u === "/api/crm/inbox/m1") return Promise.resolve({ subject: "Hello", from: hello.from, toRecipients: [], ccRecipients: [], body: { content: "<p>Opened body text</p>", contentType: "html" }, receivedDateTime: RECEIVED });
      if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
      if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
      return Promise.resolve({});
    });
    render(<CommunicationsPage initialTab="inbox" />);
    await screen.findByText("Hello");
    await act(async () => { mailboxes.resolve({ mine: { address: "todd@boreal.financial", display_name: "Todd" }, shared: [{ address: "shared@boreal.financial", display_name: "Shared" }] }); });
    await flush();
    // The merged list has not arrived yet; the user opens the email from the list on screen.
    fireEvent.click(screen.getByText("Hello"));
    expect(await screen.findByText("Opened body text")).toBeTruthy();
    await act(async () => { sharedList.resolve([]); });
    await flush();
    expect(screen.getByText("Opened body text")).toBeTruthy();
  });
});
