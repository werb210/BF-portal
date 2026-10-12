// BF_PORTAL_LIBRARY_PAGE_v762
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  const withScopes = vi.fn((_scopes: readonly string[], call: () => Promise<unknown>, _opts?: { interactive?: boolean }) => call());
  const useAuth = vi.fn();
  const useSilo = vi.fn();
  return { apiFn, withScopes, useAuth, useSilo };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: h.withScopes,
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
// Sidebar (AppLayout) and Settings page dependencies, as in their own tests.
vi.mock("@/auth/AuthContext", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/auth/AuthContext")>()), useAuth: () => h.useAuth() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => h.useAuth() }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => h.useSilo() }));
vi.mock("@/components/layout/Topbar", () => ({ default: () => <div data-testid="topbar-mock" /> }));
vi.mock("@/components/maya/MayaChat", () => ({ default: () => <div data-testid="maya-mock" /> }));
vi.mock("@/pages/settings/tabs/ProfileSettings", () => ({ default: () => <div data-testid="profile-mock" /> }));

import LibraryPage, { teamShareLink, humanSize } from "../LibraryPage";
import AppLayout from "@/layouts/AppLayout";
import SettingsPage from "@/pages/settings/SettingsPage";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import App from "@/App";
import { clearAuthToken, setAuthToken } from "@/lib/authToken";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
const page = () => render(<MemoryRouter initialEntries={["/library"]}><Routes><Route path="/library" element={<LibraryPage />} /><Route path="/communications" element={<Where />} /></Routes></MemoryRouter>);

beforeEach(() => {
  h.apiFn.mockReset(); h.apiFn.get.mockReset(); h.apiFn.post.mockReset(); h.withScopes.mockClear();
  h.useAuth.mockReturnValue({ user: { id: "u1", role: "Admin", capabilities: [] }, authStatus: "authenticated" });
  h.useSilo.mockReturnValue({ silo: "BF" });
  h.apiFn.mockResolvedValue({});
  h.apiFn.get.mockImplementation(async (url: string) => url.includes("item=F1")
    ? { configured: true, url: "https://lib", items: [{ id: "X1", name: "Bizcap form.pdf", webUrl: "https://od/X1", size: 2048, lastModified: "2026-10-07T00:00:00Z", isFolder: false }] }
    : { configured: true, url: "https://lib", items: [{ id: "F1", name: "Lender Forms", webUrl: "https://od/F1", size: null, lastModified: null, isFolder: true }] });
  h.apiFn.post.mockImplementation(async (url: string) => url.endsWith("/upload-session") ? { ok: true, uploadUrl: "https://x.sharepoint.com/u", chunkBytes: 5242880 } : url.endsWith("/upload-chunk") ? { ok: true, done: true } : { ok: true });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Staff Library page", () => {
  it("opens folders and shares a file into Team chat", async () => {
    page();
    fireEvent.click(await screen.findByText(/Lender Forms/));
    expect(await screen.findByText(/Bizcap form\.pdf/)).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
    // BF_PORTAL_v789_INCREMENTAL_CONSENT - the library asks for OneDrive access when it is used.
    expect(h.withScopes).toHaveBeenCalledWith(["Files.ReadWrite"], expect.any(Function));
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/o365/library?item=F1");
    fireEvent.click(screen.getByTestId("library-share"));
    expect(screen.getByTestId("where").textContent).toBe(teamShareLink("Bizcap form.pdf", "https://od/X1"));
  });
  it("uploads into the folder that is open", async () => {
    page();
    fireEvent.click(await screen.findByText(/Lender Forms/));
    await screen.findByText(/Bizcap form\.pdf/);
    const file = new File(["hello"], "New form.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("library-file-input"), { target: { files: [file] } });
    // BF_PORTAL_LIBRARY_BIG_UPLOAD_v772 - uploads now go through an upload session in pieces.
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/upload-session", { name: "New form.pdf", folderId: "F1", size: 5 }));
    expect(await screen.findByText("Uploaded 1 file.")).toBeTruthy();
  });
  it("offers to create the library when there is none", async () => {
    h.apiFn.get.mockResolvedValue({ configured: false, items: [] });
    page();
    fireEvent.click(await screen.findByText("Create the Staff Library"));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/ensure", {}));
  });
  it("formats sizes", () => {
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

// BF_PORTAL_LIBRARY_IN_SETTINGS_v764 - a Settings tab now; /library forwards there.
describe("where the Library lives", () => {
  it("is not in the sidebar", () => {
    render(<MemoryRouter><AppLayout><div>page</div></AppLayout></MemoryRouter>);
    // The sidebar rendered (Communications is a BF Admin link) but has no Library entry.
    expect(screen.getByRole("link", { name: "Communications" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Library$/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/library"]')).toBeNull();
  });

  it("is a Settings tab that shows the Library page", async () => {
    render(
      <MemoryRouter initialEntries={["/settings/library"]}>
        <Routes><Route path="/settings/:tab" element={<SettingsPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: "Library" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByTestId("library-page")).toBeInTheDocument();
    expect(await screen.findByText(/Lender Forms/)).toBeInTheDocument();
  });

  it("the old /library address forwards to the Settings Library tab", async () => {
    setAuthToken("test-token");
    try {
      render(<MemoryRouter initialEntries={["/library"]}><App /></MemoryRouter>);
      expect(await screen.findByRole("tab", { name: "Library" }, { timeout: 5000 })).toHaveAttribute("aria-selected", "true");
      expect(await screen.findByTestId("library-page")).toBeInTheDocument();
    } finally {
      clearAuthToken();
    }
  });
});

describe("Team chat starts the message with the shared file", () => {
  const channels = { channels: [{ id: "ch1", kind: "channel", name: "general", dm_key: null, created_by: null, created_at: "2026-06-01T00:00:00Z", member_ids: [], last_read_at: null, last_message: null, unread_count: 0 }] };
  beforeEach(() => {
    h.apiFn.mockImplementation((url: string) => {
      const u = String(url);
      if (u === "/api/team/channels") return Promise.resolve(channels);
      if (u === "/api/team/channels/ch1/messages") return Promise.resolve({ messages: [] });
      if (u.startsWith("/api/templates")) return Promise.resolve({ items: [] });
      if (u === "/api/communications/sms" || u === "/api/communications/messages-list") return Promise.resolve({ conversations: [] });
      if (u === "/api/portal/issues") return Promise.resolve({ issues: [] });
      if (u.startsWith("/api/crm/inbox")) return Promise.resolve([]);
      return Promise.resolve({});
    });
  });

  it("prefills the Team composer from the Library share link", async () => {
    window.history.replaceState(null, "", teamShareLink("Bizcap form.pdf", "https://od/X1") + "&channel=ch1");
    render(<CommunicationsPage />);
    const draft = (await screen.findByTestId("team-draft")) as HTMLTextAreaElement;
    expect(draft.value).toBe("Bizcap form.pdf: https://od/X1");
  });

  it("ignores a share link that is not https", async () => {
    window.history.replaceState(null, "", "/communications?tab=team&channel=ch1&share=" + encodeURIComponent("javascript:alert(1)") + "&name=x");
    render(<CommunicationsPage />);
    const draft = (await screen.findByTestId("team-draft")) as HTMLTextAreaElement;
    expect(draft.value).toBe("");
  });
});
