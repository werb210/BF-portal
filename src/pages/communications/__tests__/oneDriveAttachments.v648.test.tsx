// BF_PORTAL_ONEDRIVE_ATTACHMENTS_v648
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { FILES_READWRITE_SCOPES, signInO365Scopes } from "@/auth/o365Scopes";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  const withScopes = vi.fn((_scopes: readonly string[], call: () => Promise<unknown>, _opts?: { interactive?: boolean }) => call());
  const ensure = vi.fn(async (_scopes: readonly string[], _opts?: { interactive?: boolean }) => true);
  return { apiFn, withScopes, ensure };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: h.withScopes,
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
vi.mock("@/auth/msal", () => ({ ensureO365Scopes: h.ensure, msalClient: {} }));

import CommunicationsPage from "../CommunicationsPage";
import O365ComposeModal from "@/components/communications/O365ComposeModal";

const SAVE_URL = "/api/crm/inbox/m1/attachments/save-to-onedrive";

function routeApi(url: string): Promise<unknown> {
  const u = String(url);
  if (u === "/api/crm/shared-mailboxes") return Promise.resolve({ mine: null, shared: [] });
  if (u === "/api/crm/inbox") {
    return Promise.resolve([{ id: "m1", subject: "Bank statements", bodyPreview: "Attached", from: { emailAddress: { address: "client@example.com", name: "Client" } }, receivedDateTime: "2026-06-09T14:05:00Z", isRead: true }]);
  }
  if (u === "/api/crm/inbox/m1") {
    return Promise.resolve({ subject: "Bank statements", from: { emailAddress: { address: "client@example.com", name: "Client" } }, body: { content: "See attached", contentType: "text" }, receivedDateTime: "2026-06-09T14:05:00Z" });
  }
  if (u === "/api/crm/inbox/m1/attachments") return Promise.resolve([{ id: "a1", name: "statement.pdf", contentType: "application/pdf", size: 2048 }]);
  if (u === "/api/crm/inbox/m1/attachments/a1") return Promise.resolve({ name: "statement.pdf", contentType: "application/pdf", contentBytes: btoa("pdf") });
  if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
  if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
  if (u === "/api/collateral") return Promise.resolve([]);
  if (u.startsWith("/api/recipients/suggest")) {
    return Promise.resolve({ recipients: [{ id: "p1", name: "Andrew Polturak", email: "andrew.p@boreal.financial", kind: "staff" }] });
  }
  if (u === "/api/communications/sms" || u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
  if (u === "/api/team/channels") return Promise.resolve({ channels: [] });
  if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
  return Promise.resolve({});
}

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.withScopes.mockClear();
  h.ensure.mockClear();
  h.apiFn.mockImplementation(routeApi);
  h.apiFn.post.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/communications");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The inbox reloads (and clears the selection) once the mailbox list arrives, so wait for
// that before opening an email; a click that lands earlier is undone by the reload.
async function mailboxesLoaded() {
  await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/shared-mailboxes"));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

async function openEmail() {
  render(<CommunicationsPage initialTab="inbox" />);
  await mailboxesLoaded();
  fireEvent.click(await screen.findByText("Bank statements"));
  return screen.findByTestId("attachments-save-all");
}

describe("v648 attachments to OneDrive", () => {
  // BF_PORTAL_v789_INCREMENTAL_CONSENT - OneDrive access is asked for when a OneDrive feature is used.
  it("OneDrive access is requested on use, not at sign-in", () => {
    expect(FILES_READWRITE_SCOPES).toContain("Files.ReadWrite");
    expect(signInO365Scopes("User.Read,Mail.Send,Files.ReadWrite")).not.toContain("Files.ReadWrite");
  });

  it("in the app the button saves to OneDrive, asking for OneDrive access on the click", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
    h.apiFn.post.mockResolvedValue({ saved: [{ name: "statement.pdf" }], failed: [], folder: "Email Attachments/Client/2026-06-09 - Bank statements", folderUrl: "https://onedrive.example/folder" });
    const button = await openEmail();
    expect(button).toHaveTextContent("Save all to OneDrive");

    fireEvent.click(button);
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith(SAVE_URL, {}));
    expect(h.withScopes).toHaveBeenCalledWith(FILES_READWRITE_SCOPES, expect.any(Function), { interactive: true });

    const notice = await screen.findByTestId("attachments-notice");
    expect(notice).toHaveTextContent("Saved 1 file to OneDrive \u203A Email Attachments \u203A Client \u203A 2026-06-09 - Bank statements");
    expect(screen.getByRole("link", { name: "Open folder" })).toHaveAttribute("href", "https://onedrive.example/folder");
  });

  it("on the website the button still downloads and never calls OneDrive", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);
    const createUrl = vi.fn(() => "blob:statement");
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const button = await openEmail();
    expect(button).toHaveTextContent("Download all");
    fireEvent.click(button);

    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/crm/inbox/m1/attachments/a1", { params: {} }));
    await waitFor(() => expect(anchorClick).toHaveBeenCalled());
    expect(createUrl).toHaveBeenCalled();
    expect(h.apiFn.post).not.toHaveBeenCalledWith(SAVE_URL, expect.anything());
    await waitFor(() => expect(screen.getByTestId("attachments-save-all")).toHaveTextContent("Download all"));
  });

  it("offers Reconnect when OneDrive permission is missing", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
    h.apiFn.post.mockImplementation((url: string) =>
      url === SAVE_URL ? Promise.reject(Object.assign(new Error("Forbidden"), { details: { error: "onedrive_permission_needed" } })) : Promise.resolve({}));
    fireEvent.click(await openEmail());

    const notice = await screen.findByTestId("attachments-notice");
    expect(notice).toHaveTextContent("OneDrive needs permission. Reconnect Microsoft 365 once, then try again.");

    fireEvent.click(screen.getByRole("button", { name: "Reconnect Microsoft 365" }));
    await waitFor(() => expect(h.ensure).toHaveBeenCalledWith(expect.arrayContaining(["Mail.ReadWrite"]), { interactive: true }));
  });

  it("other save failures do not offer Reconnect", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
    h.apiFn.post.mockImplementation((url: string) => (url === SAVE_URL ? Promise.reject(new Error("boom")) : Promise.resolve({})));
    fireEvent.click(await openEmail());
    expect(await screen.findByTestId("attachments-notice")).toHaveTextContent("Could not save to OneDrive. Please try again.");
    expect(screen.queryByRole("button", { name: "Reconnect Microsoft 365" })).not.toBeInTheDocument();
  });
});

describe("v648 Cc and Bcc suggest addresses like To", () => {
  for (const field of ["Cc", "Bcc"] as const) {
    it(`${field} uses the address autocomplete`, async () => {
      render(<O365ComposeModal open onClose={() => undefined} />);
      fireEvent.click(screen.getByRole("button", { name: "+ Cc / Bcc" }));
      const input = screen.getByPlaceholderText(`${field} (comma-separated)`) as HTMLInputElement;

      fireEvent.change(input, { target: { value: "andr" } });
      await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/recipients/suggest?q=andr&limit=10"));
      fireEvent.click(await screen.findByText("Andrew Polturak"));
      await waitFor(() => expect(input.value).toBe("andrew.p@boreal.financial, "));
    });
  }
});
