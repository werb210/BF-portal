// BF_PORTAL_LIBRARY_BIG_UPLOAD_v772
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
const post = vi.fn();
vi.mock("@/api", () => ({ api: { get: vi.fn(), post: (...a: unknown[]) => post(...a) } }));
import { uploadInPieces } from "../LibraryPage";

const MB = 1024 * 1024;
beforeEach(() => { post.mockReset(); });

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
  });
  it("allows files up to 200 MB", () => {
    const page = readFileSync("src/pages/library/LibraryPage.tsx", "utf8");
    expect(page).toContain("const MAX_BYTES = 200 * 1024 * 1024;");
    expect(page).toContain("over 200 MB");
  });
  it("the api client sends file pieces as raw bytes, not JSON", () => {
    expect(readFileSync("src/api/index.ts", "utf8")).toContain("options.body instanceof Blob");
  });
});
