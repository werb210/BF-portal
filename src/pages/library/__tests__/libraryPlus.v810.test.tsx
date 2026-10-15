// BF_PORTAL_v810_LIBRARY_PLUS - the Dropbox-style Staff Library, rendered against a mocked API.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn, withScopes: vi.fn((_s: readonly string[], call: () => Promise<unknown>) => call()), blob: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: h.withScopes, withO365Refresh: (call: () => Promise<unknown>) => call() }));
vi.mock("@/utils/api", () => ({ apiBlob: h.blob }));

import LibraryPage, { filesFromDrop } from "../LibraryPage";

const ROOT = [
  { id: "F1", name: "Lender Forms", isFolder: true, webUrl: "https://od/F1", size: null, lastModified: "2026-10-01T00:00:00Z", childCount: 3 },
  { id: "A1", name: "Agreement.pdf", isFolder: false, webUrl: "https://od/A1", size: 2048, lastModified: "2026-10-10T00:00:00Z", mimeType: "application/pdf", modifiedBy: "Andrew P", thumbnailUrl: "https://thumb/A1" },
  { id: "B1", name: "Big deck.pdf", isFolder: false, webUrl: "https://od/B1", size: 9 * 1024 * 1024, lastModified: "2026-10-11T00:00:00Z", mimeType: "application/pdf" },
];
const CLIENT = { id: "c1", name: "Sam Client", email: "sam@x.co", phone: "+15875550123", application_id: "app1" };

beforeEach(() => {
  for (const k of ["get", "post", "put", "patch", "delete"]) h.apiFn[k].mockReset();
  h.apiFn.mockReset().mockResolvedValue({});
  h.blob.mockReset();
  h.apiFn.get.mockImplementation(async (url: string) => {
    if (url === "/api/o365/library") return { configured: true, url: "https://lib", items: ROOT };
    if (url.startsWith("/api/o365/library?item=")) return { configured: true, url: "https://lib", items: [] };
    if (url === "/api/o365/library/stars") return { items: [] };
    if (url.startsWith("/api/o365/library/search")) return { items: [{ ...ROOT[1], name: "Agreement signed.pdf", id: "A9" }] };
    if (url === "/api/o365/library/trash") return { items: [{ item_id: "T1", item_name: "Old.pdf", is_folder: false, deleted_at: "2026-10-12T00:00:00Z", purge_at: "2026-11-11T00:00:00Z", deleted_by_name: "Todd W" }] };
    if (url === "/api/o365/library/activity") return { items: [{ id: "x1", item_name: "Agreement.pdf", action: "uploaded", actor_name: "Andrew P", created_at: "2026-10-14T00:00:00Z" }] };
    if (url.startsWith("/api/o365/library/clients")) return { items: [CLIENT] };
    if (url === "/api/o365/library/item/A1/content") return { name: "Agreement.pdf", contentType: "application/pdf", size: 5, dataUrl: "data:application/pdf;base64,aGVsbG8=" };
    if (url === "/api/o365/library/item/A1/preview") return { kind: "pdf", embedUrl: "https://preview/A1", downloadUrl: null, webUrl: "https://od/A1", item: ROOT[1] };
    return { items: [] };
  });
  h.apiFn.post.mockImplementation(async (url: string) => {
    if (url.endsWith("/share")) return { ok: true, url: "https://server.boreal.financial/api/shared/f/TOKEN123" };
    if (url.endsWith("/requests")) return { ok: true, url: "https://server.boreal.financial/api/shared/r/REQ123" };
    if (url.endsWith("/folder")) return { ok: true, item: { id: "NEWF", name: "Deals", isFolder: true } };
    if (url.endsWith("/upload-session")) return { uploadUrl: "https://x.sharepoint.com/u", chunkBytes: 5242880 };
    if (url.endsWith("/upload-chunk")) return { done: true };
    return { ok: true };
  });
  h.apiFn.patch.mockResolvedValue({ ok: true });
  h.apiFn.delete.mockResolvedValue({ ok: true, restoreDays: 30 });
  h.apiFn.put.mockResolvedValue({ ok: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const page = async () => {
  render(<MemoryRouter><LibraryPage /></MemoryRouter>);
  await screen.findByText("Agreement.pdf");
};
const rowOf = (name: string) => screen.getAllByTestId("library-row").find((r) => r.textContent?.includes(name))!;
const openMenu = (name: string) => fireEvent.click(within(rowOf(name)).getByTestId("library-more"));

describe("v810 browsing", () => {
  it("shows thumbnails, sizes, who changed it, and item counts", async () => {
    await page();
    expect(within(rowOf("Agreement.pdf")).getByRole("img")).toHaveAttribute("src", "https://thumb/A1");
    expect(rowOf("Agreement.pdf").textContent).toContain("Andrew P");
    expect(rowOf("Lender Forms").textContent).toContain("3 items");
  });
  it("sorts by size and switches to a grid", async () => {
    await page();
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "size" } });
    const names = screen.getAllByTestId("library-row").map((r) => r.textContent ?? "");
    expect(names[0]).toContain("Lender Forms");
    expect(names[1]).toContain("Big deck.pdf");
    fireEvent.click(screen.getByTestId("library-layout"));
    expect(screen.getAllByTestId("library-card")).toHaveLength(3);
  });
  it("stars a file and pins it to the top", async () => {
    await page();
    fireEvent.click(screen.getByRole("button", { name: "Star Big deck.pdf" }));
    expect(h.apiFn.put).toHaveBeenCalledWith("/api/o365/library/item/B1/star", { starred: true, name: "Big deck.pdf", isFolder: false });
    expect(screen.getAllByTestId("library-row")[1]!.textContent).toContain("Big deck.pdf");
  });
  it("searches the whole library", async () => {
    await page();
    fireEvent.change(screen.getByTestId("library-search"), { target: { value: "agree" } });
    expect(await screen.findByText("Agreement signed.pdf", {}, { timeout: 2000 })).toBeTruthy();
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/o365/library/search?q=agree");
  });
  it("previews a file in a side panel", async () => {
    await page();
    fireEvent.click(screen.getByText("Agreement.pdf"));
    const panel = await screen.findByTestId("library-preview");
    await waitFor(() => expect(panel.querySelector("iframe")).toHaveAttribute("src", "https://preview/A1"));
  });
});

describe("v810 rename, move, delete and the recycle bin", () => {
  it("renames from the menu", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Agreement 2026.pdf");
    await page();
    openMenu("Agreement.pdf");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    await waitFor(() => expect(h.apiFn.patch).toHaveBeenCalledWith("/api/o365/library/item/A1", { name: "Agreement 2026.pdf" }));
  });
  it("delete asks first and says it can be restored for 30 days", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await page();
    openMenu("Agreement.pdf");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(h.apiFn.delete).toHaveBeenCalledWith("/api/o365/library/item/A1"));
    expect(await screen.findByText("Agreement.pdf is in the Recycle bin for 30 days.")).toBeTruthy();
  });
  it("restores from the recycle bin", async () => {
    await page();
    fireEvent.click(screen.getByRole("tab", { name: "Recycle bin" }));
    expect(await screen.findByText(/Old\.pdf/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/trash/T1/restore", {}));
  });
  it("dragging a file onto a folder moves it", async () => {
    await page();
    const store: Record<string, string> = {};
    const dt = { setData: (k: string, v: string) => { store[k] = v; }, getData: (k: string) => store[k] ?? "", get types() { return Object.keys(store); }, effectAllowed: "" };
    fireEvent.dragStart(rowOf("Agreement.pdf"), { dataTransfer: dt });
    fireEvent.dragOver(rowOf("Lender Forms"), { dataTransfer: dt });
    fireEvent.drop(rowOf("Lender Forms"), { dataTransfer: dt });
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/item/A1/move", { folderId: "F1" }));
  });
});

describe("v810 sharing outside Boreal", () => {
  it("makes a share link with an expiry and a password", async () => {
    await page();
    openMenu("Agreement.pdf");
    fireEvent.click(screen.getByRole("menuitem", { name: "Share link (outside Boreal)..." }));
    const dlg = screen.getByTestId("library-share-dialog");
    fireEvent.change(within(dlg).getByLabelText("Link works for"), { target: { value: "30" } });
    fireEvent.change(within(dlg).getByLabelText("Password (optional)"), { target: { value: "bf2026" } });
    fireEvent.click(within(dlg).getByTestId("ls-create"));
    expect(await within(dlg).findByDisplayValue("https://server.boreal.financial/api/shared/f/TOKEN123")).toBeTruthy();
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/item/A1/share", { expiresDays: 30, password: "bf2026", allowDownload: true });
    expect(within(dlg).getByText("Send the password separately.")).toBeTruthy();
  });
  it("makes an upload link for the open folder", async () => {
    await page();
    fireEvent.click(screen.getByTestId("library-request"));
    const dlg = screen.getByTestId("library-request-dialog");
    fireEvent.change(within(dlg).getByLabelText("What are you asking for?"), { target: { value: "Signed agreement" } });
    fireEvent.click(within(dlg).getByTestId("rq-create"));
    expect(await within(dlg).findByDisplayValue("https://server.boreal.financial/api/shared/r/REQ123")).toBeTruthy();
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/requests", { folderId: "", title: "Signed agreement", expiresDays: 14 });
  });
});

describe("v810 send to client", () => {
  const pick = async (file: string) => {
    await page();
    openMenu(file);
    fireEvent.click(screen.getByRole("menuitem", { name: "Send to client..." }));
    const dlg = screen.getByTestId("library-send-dialog");
    fireEvent.change(within(dlg).getByLabelText("Client"), { target: { value: "sam" } });
    fireEvent.click(await within(dlg).findByTestId("sd-option", {}, { timeout: 2000 }));
    return dlg;
  };
  it("a small file goes into the client portal as an attachment", async () => {
    const dlg = await pick("Agreement.pdf");
    fireEvent.click(within(dlg).getByTestId("sd-send"));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/communications/messages/send", {
      applicationId: "app1", contactId: "c1", body: "Here is Agreement.pdf from Boreal Financial.",
      attachments: [{ name: "Agreement.pdf", contentType: "application/pdf", dataUrl: "data:application/pdf;base64,aGVsbG8=" }],
    }));
    expect(await screen.findByText("Sent to Sam Client's client portal.")).toBeTruthy();
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/item/A1/sent", { name: "Agreement.pdf", how: "portal", to: "Sam Client" });
  });
  it("a big file is emailed as a 7-day link", async () => {
    const dlg = await pick("Big deck.pdf");
    fireEvent.click(within(dlg).getByTestId("sd-how-email"));
    fireEvent.click(within(dlg).getByTestId("sd-send"));
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/o365/mail/send", expect.objectContaining({ method: "POST" })));
    const mail = h.apiFn.mock.calls.find((c: any[]) => c[0] === "/api/o365/mail/send")![1].body;
    expect(mail.to).toEqual(["sam@x.co"]);
    expect(mail.attachments).toEqual([]);
    expect(mail.body_html).toContain("https://server.boreal.financial/api/shared/f/TOKEN123");
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/item/B1/share", { expiresDays: 7, password: "", allowDownload: true });
  });
  it("a text always sends a link", async () => {
    const dlg = await pick("Agreement.pdf");
    fireEvent.click(within(dlg).getByTestId("sd-how-text"));
    fireEvent.click(within(dlg).getByTestId("sd-send"));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/communications/sms", expect.objectContaining({ to: "+15875550123", contactId: "c1" })));
    const sms = h.apiFn.post.mock.calls.find((c: any[]) => c[0] === "/api/communications/sms")![1];
    expect(sms.body).toContain("/api/shared/f/TOKEN123");
  });
});

describe("v810 activity, zip and dropped folders", () => {
  it("shows who did what", async () => {
    await page();
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(await screen.findByText("Andrew P uploaded Agreement.pdf")).toBeTruthy();
  });
  it("downloads the open folder as a zip", async () => {
    h.blob.mockResolvedValue(new Blob(["PK"]));
    const createURL = vi.fn(() => "blob:zip");
    Object.assign(URL, { createObjectURL: createURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await page();
    fireEvent.click(screen.getByRole("button", { name: "Download zip" }));
    await waitFor(() => expect(h.blob).toHaveBeenCalledWith("/api/o365/library/zip"));
    await waitFor(() => expect(click).toHaveBeenCalled());
  });
  it("reads files inside dropped folders, keeping their folder path", async () => {
    const f = (name: string) => ({ isFile: true, isDirectory: false, name, file: (ok: (x: File) => void) => ok(new File(["x"], name)) });
    let read = false;
    const dir = { isFile: false, isDirectory: true, name: "Deals", createReader: () => ({ readEntries: (ok: (e: any[]) => void) => { ok(read ? [] : [f("a.pdf"), { isFile: false, isDirectory: true, name: "2026", createReader: () => { let done = false; return { readEntries: (ok2: (e: any[]) => void) => { ok2(done ? [] : [f("b.pdf")]); done = true; } }; } }]); read = true; } }) };
    const out = await filesFromDrop({ items: [{ webkitGetAsEntry: () => dir }], files: [] } as any);
    expect(out.map((u) => u.dir + "/" + u.file.name)).toEqual(["Deals/a.pdf", "Deals/2026/b.pdf"]);
  });
  it("a dropped folder is created in the library and its files go into it", async () => {
    await page();
    const file = new File(["hello"], "a.pdf");
    const entry = { isFile: false, isDirectory: true, name: "Deals", createReader: () => { let done = false; return { readEntries: (ok: (e: any[]) => void) => { ok(done ? [] : [{ isFile: true, isDirectory: false, name: "a.pdf", file: (cb: (x: File) => void) => cb(file) }]); done = true; } }; } };
    await act(async () => {
      fireEvent.drop(screen.getByTestId("library-page"), { dataTransfer: { types: ["Files"], items: [{ webkitGetAsEntry: () => entry }], files: [file] } });
    });
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/folder", { name: "Deals", folderId: null }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365/library/upload-session", { name: "a.pdf", folderId: "NEWF", size: 5 }));
  });
});
