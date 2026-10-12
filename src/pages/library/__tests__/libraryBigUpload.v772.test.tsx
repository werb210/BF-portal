// BF_PORTAL_LIBRARY_BIG_UPLOAD_v772
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  return { apiFn, withScopes: vi.fn((_s: readonly string[], call: () => Promise<unknown>) => call()) };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({
  withO365Scopes: h.withScopes,
  withO365Refresh: (call: () => Promise<unknown>) => call(),
}));
import LibraryPage, { uploadInPieces } from "../LibraryPage";

const MB = 1024 * 1024;
const post = h.apiFn.post;
beforeEach(() => {
  post.mockReset();
  h.withScopes.mockClear();
  h.apiFn.get.mockReset().mockResolvedValue({ configured: true, url: "https://lib", items: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A file that reports `size` bytes without allocating them. */
function bigFile(name: string, size: number): File {
  const f = new File(["x"], name);
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("Staff Library uploads up to 200 MB in pieces", () => {
  it("sends a 12 MB file as three 5 MB-or-less pieces with the right offsets", async () => {
    const pieces: Array<{ start: string; size: number }> = [];
    post.mockImplementation(async (url: string, body: any, opts: any) => {
      if (url.endsWith("/upload-session")) return { uploadUrl: "https://x.sharepoint.com/u", chunkBytes: 5 * MB };
      pieces.push({ start: opts.headers["x-chunk-start"], size: (body as Blob).size });
      return { done: pieces.length === 3 };
    });
    const file = new File([new Uint8Array(12 * MB)], "Setup.exe");
    const seen: number[] = [];
    await uploadInPieces(file, "F1", (p) => seen.push(p));
    expect(post.mock.calls[0]).toEqual(["/api/o365/library/upload-session", { name: "Setup.exe", folderId: "F1", size: 12 * MB }]);
    expect(pieces).toEqual([{ start: "0", size: 5 * MB }, { start: String(5 * MB), size: 5 * MB }, { start: String(10 * MB), size: 2 * MB }]);
    expect(seen[seen.length - 1]).toBe(100);
    // BF_PORTAL_v789_INCREMENTAL_CONSENT - the upload session asks for Files.ReadWrite interactively.
    expect(h.withScopes).toHaveBeenCalledWith(expect.any(Array), expect.any(Function), { interactive: true });
  });

  it("allows files up to 200 MB and refuses anything over", async () => {
    post.mockImplementation(async (url: string) => (url.endsWith("/upload-session") ? { uploadUrl: "https://x.sharepoint.com/u", chunkBytes: 5 * MB } : { done: true }));
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    const input = await screen.findByTestId("library-file-input");
    await act(async () => {
      fireEvent.change(input, { target: { files: [bigFile("Exact.iso", 200 * MB), bigFile("Huge.iso", 200 * MB + 1)] } });
    });
    const status = await screen.findByText(/Not uploaded/);
    expect(status).toHaveTextContent("Uploaded 1. Not uploaded: Huge.iso (over 200 MB - upload it in OneDrive)");
    const sessions = post.mock.calls.filter(([url]: [string]) => url.endsWith("/upload-session")).map(([, body]: [string, { name: string }]) => body.name);
    expect(sessions).toEqual(["Exact.iso"]);
  });

  it("the api client sends file pieces as raw bytes, not JSON", async () => {
    const actual = await vi.importActual<typeof import("@/api")>("@/api");
    localStorage.setItem("auth_token", "a.b.c");
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const piece = new Blob([new Uint8Array([1, 2, 3])]);
    await actual.rawApiFetch("/api/o365/library/upload-chunk", { method: "POST", body: piece, headers: { "Content-Type": "application/octet-stream" } });
    await actual.rawApiFetch("/api/o365/library/folder", { method: "POST", body: { name: "x" } });
    localStorage.removeItem("auth_token");
    expect(fetchMock.mock.calls[0]![1]!.body).toBe(piece);
    expect(fetchMock.mock.calls[1]![1]!.body).toBe(JSON.stringify({ name: "x" }));
  });
});
