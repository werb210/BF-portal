// BF_PORTAL_LIBRARY_PAGE_v762
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
const get = vi.fn(), post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
import LibraryPage, { teamShareLink, humanSize } from "../LibraryPage";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
const page = () => render(<MemoryRouter initialEntries={["/library"]}><Routes><Route path="/library" element={<LibraryPage />} /><Route path="/communications" element={<Where />} /></Routes></MemoryRouter>);

beforeEach(() => {
  get.mockReset(); post.mockReset();
  get.mockImplementation(async (url: string) => url.includes("item=F1")
    ? { configured: true, url: "https://lib", items: [{ id: "X1", name: "Bizcap form.pdf", webUrl: "https://od/X1", size: 2048, lastModified: "2026-10-07T00:00:00Z", isFolder: false }] }
    : { configured: true, url: "https://lib", items: [{ id: "F1", name: "Lender Forms", webUrl: "https://od/F1", size: null, lastModified: null, isFolder: true }] });
  post.mockImplementation(async (url: string) => url.endsWith("/upload-session") ? { ok: true, uploadUrl: "https://x.sharepoint.com/u", chunkBytes: 5242880 } : url.endsWith("/upload-chunk") ? { ok: true, done: true } : { ok: true });
});

describe("Staff Library page", () => {
  it("opens folders and shares a file into Team chat", async () => {
    page();
    fireEvent.click(await screen.findByText(/Lender Forms/));
    expect(await screen.findByText(/Bizcap form\.pdf/)).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
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
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/o365/library/upload-session", { name: "New form.pdf", folderId: "F1", size: 5 }));
    expect(await screen.findByText("Uploaded 1 file.")).toBeTruthy();
  });
  it("offers to create the library when there is none", async () => {
    get.mockResolvedValue({ configured: false, items: [] });
    page();
    fireEvent.click(await screen.findByText("Create the Staff Library"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/o365/library/ensure", {}));
  });
  it("is in the sidebar and routed, and Team chat starts the message with the shared file", () => {
    // BF_PORTAL_LIBRARY_IN_SETTINGS_v764 - a Settings tab now; /library forwards there.
    expect(readFileSync("src/layouts/AppLayout.tsx", "utf8")).not.toContain('path: "/library"');
    expect(readFileSync("src/pages/settings/SettingsPage.tsx", "utf8")).toContain('{ id: "library", label: "Library", visible: true, content: <LibraryPage /> }');
    expect(readFileSync("src/App.tsx", "utf8")).toContain('<Route path="/library" element={<Navigate to="/settings/library" replace />} />');
    expect(readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8")).toContain('const share = p.get("share");');
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
