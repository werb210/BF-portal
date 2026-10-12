// BF_PORTAL_DOCUMENT_REVIEW_PANE_v261
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import cspConfig from "../../../../staticwebapp.config.json";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.delete = vi.fn();
  return {
    apiFn,
    apiBlob: vi.fn(),
    getDocument: vi.fn(),
  };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: vi.fn() }));
vi.mock("@/utils/api", () => ({ apiBlob: (url: string) => h.apiBlob(url) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Staff" } }) }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (arg: unknown) => h.getDocument(arg),
}));
vi.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url", () => ({ default: "/pdf.worker.js" }));
vi.mock("@/components/applications/AcceptNameDialog", () => ({
  default: (p: { documentId: string; onConfirm: (n: string | null) => void }) => (
    <div data-testid="accept-name-dialog" data-document-id={p.documentId}>
      <button type="button" onClick={() => p.onConfirm("Bank statement Jan")}>Save name and accept</button>
    </div>
  ),
}));

import PdfPages, { looksLikeImage, looksLikePdf } from "../PdfPages";
import DocumentSplitView, { type SplitViewReview } from "../DocumentSplitView";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const csp = cspConfig.globalHeaders["Content-Security-Policy"];
const directive = (name: string) =>
  csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `))?.split(/\s+/).slice(1) ?? [];

// jsdom's Blob has no arrayBuffer(); browsers do.
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

let innerWidth: number;
beforeEach(() => {
  innerWidth = window.innerWidth;
  sessionStorage.clear();
  h.getDocument.mockReset().mockReturnValue({ promise: Promise.resolve({ numPages: 0, getPage: vi.fn() }) });
  h.apiBlob.mockReset();
  h.apiFn.get.mockReset();
  h.apiFn.post.mockReset().mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
});

const setWidth = (w: number) => Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
const review = (over: Partial<SplitViewReview> = {}): SplitViewReview => ({
  working: undefined, onAccept: vi.fn(), onReject: vi.fn(), onNext: vi.fn(), hasNext: true, ...over,
});

describe("document preview detection", () => {
  it("recognises PDFs by type, name, or signature", () => {
    expect(looksLikePdf("application/pdf", null)).toBe(true);
    expect(looksLikePdf("application/octet-stream", "statement.pdf")).toBe(true);
    expect(looksLikePdf("application/octet-stream", "scan", new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(true);
    expect(looksLikePdf("application/octet-stream", "notes.docx")).toBe(false);
  });
  it("recognises images", () => {
    expect(looksLikeImage("image/jpeg", null)).toBe(true);
    expect(looksLikeImage(null, "cheque.PNG")).toBe(true);
    expect(looksLikeImage("application/pdf", "x.pdf")).toBe(false);
  });
});

describe("review pane wiring", () => {
  it("does not depend on object URLs embedded with object", async () => {
    setWidth(1400);
    const blob = new Blob([PDF_BYTES], { type: "application/pdf" });
    const { container } = render(
      <DocumentSplitView doc={{ url: "blob:x/1", filename: "s.pdf", mimeType: "application/pdf", blob }} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(h.getDocument).toHaveBeenCalled());
    expect(container.querySelector("object, embed, iframe")).toBeNull();
    expect(directive("object-src").join(" ")).not.toContain("blob:");
  });

  it("renders downloaded PDF bytes and blob images", async () => {
    render(<PdfPages blob={new Blob([PDF_BYTES])} />);
    await waitFor(() => expect(h.getDocument).toHaveBeenCalledTimes(1));
    // pdf.js gets the bytes themselves (no URL fetch, no eval switch - BF_PORTAL_DEPS_v779).
    expect(h.getDocument.mock.calls[0]![0]).toEqual({ data: PDF_BYTES });
    cleanup();

    render(<DocumentSplitView doc={{ url: "blob:x/2", filename: "cheque.png", mimeType: "image/png" }} onClose={vi.fn()} />);
    expect(screen.getByRole("img", { name: "cheque.png" }).getAttribute("src")).toBe("blob:x/2");
    expect(directive("img-src")).toContain("blob:");
  });

  it("offers review actions: reject needs a reason, then Confirm reject sends it", () => {
    setWidth(1400);
    const r = review();
    render(<DocumentSplitView doc={{ url: "blob:x/3", filename: "a.png", mimeType: "image/png", documentId: "d1", status: "pending" }} onClose={vi.fn()} review={r} />);
    const bar = screen.getByTestId("review-bar");
    expect(bar).toHaveTextContent("Status: pending");
    fireEvent.click(screen.getByRole("button", { name: "Next \u203a" }));
    expect(r.onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const confirm = screen.getByRole("button", { name: "Confirm reject" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Reason the applicant will see/), { target: { value: "  missing pages  " } });
    fireEvent.click(confirm);
    expect(r.onReject).toHaveBeenCalledWith("missing pages");
  });

  it("takes the full width below 900px and docks beside the application above it", () => {
    setWidth(899);
    render(<DocumentSplitView doc={{ url: "blob:x/4", filename: "a.png", mimeType: "image/png" }} onClose={vi.fn()} />);
    expect(screen.getByTestId("document-split-view").style.width).toBe("100%");
    expect(screen.queryByTestId("full-screen")).toBeNull();
    cleanup();
    setWidth(900);
    render(<DocumentSplitView doc={{ url: "blob:x/4", filename: "a.png", mimeType: "image/png" }} onClose={vi.fn()} />);
    expect(screen.getByTestId("document-split-view").style.width).toBe("560px");
  });

  it("Accept in the pane opens the name dialog (v266/v270), then advances to the next pending document", async () => {
    setWidth(1400);
    const docs = [
      { documentId: "d1", category: "6 months business banking statements", title: null, filename: "jan.pdf", mimeType: "application/pdf", size: 10, storageKey: null, createdAt: "2026-01-02T00:00:00Z", status: "pending" },
      { documentId: "d2", category: "6 months business banking statements", title: null, filename: "feb.pdf", mimeType: "application/pdf", size: 10, storageKey: null, createdAt: "2026-01-01T00:00:00Z", status: "pending" },
    ];
    h.apiFn.get.mockImplementation(async (url: string) => (url.includes("/duplicates") ? [] : { documents: docs }));
    h.apiBlob.mockImplementation(async () => new Blob([PDF_BYTES], { type: "application/pdf" }));
    const createObjectURL = vi.fn((_: Blob) => `blob:test/${createObjectURL.mock.calls.length}`);
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });

    render(<DocumentsTab applicationId="app-1" />);
    const previews = await screen.findAllByRole("button", { name: "Preview" });
    fireEvent.click(previews[0]!);
    await waitFor(() => expect(h.apiBlob).toHaveBeenCalledWith("/api/portal/documents/d1/file"));
    const bar = await screen.findByTestId("review-bar");
    expect(bar).toHaveTextContent("Next \u203a");

    fireEvent.click(screen.getAllByRole("button", { name: "Accept" }).find((b) => bar.contains(b))!);
    const dialog = await screen.findByTestId("accept-name-dialog");
    expect(dialog.getAttribute("data-document-id")).toBe("d1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save name and accept" })); });

    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/portal/documents/d1/accept", { displayName: "Bank statement Jan" }));
    await waitFor(() => expect(h.apiBlob).toHaveBeenLastCalledWith("/api/portal/documents/d2/file"));
    await waitFor(() => expect(screen.queryByTestId("accept-name-dialog")).toBeNull());
  });
});
