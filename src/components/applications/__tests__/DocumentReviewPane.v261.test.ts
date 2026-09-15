import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { looksLikeImage, looksLikePdf } from "../PdfPages";

const root = path.resolve(__dirname, "../../../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("document preview detection", () => {
  it("recognises PDFs by type, name, or signature", () => {
    expect(looksLikePdf("application/pdf", null)).toBe(true);
    expect(looksLikePdf("application/octet-stream", "statement.pdf")).toBe(
      true,
    );
    expect(
      looksLikePdf(
        "application/octet-stream",
        "scan",
        new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      ),
    ).toBe(true);
    expect(looksLikePdf("application/octet-stream", "notes.docx")).toBe(false);
  });
  it("recognises images", () => {
    expect(looksLikeImage("image/jpeg", null)).toBe(true);
    expect(looksLikeImage(null, "cheque.PNG")).toBe(true);
    expect(looksLikeImage("application/pdf", "x.pdf")).toBe(false);
  });
});

describe("review pane wiring", () => {
  const view = read("src/components/applications/DocumentSplitView.tsx");
  const tab = read("src/pages/applications/tabs/DocumentsTab.tsx");
  const csp = read("staticwebapp.config.json");
  it("does not depend on object URLs embedded with object", () => {
    expect(view).not.toContain("<object");
    expect(csp).not.toMatch(/object-src[^;]*blob:/);
  });
  it("renders downloaded PDF bytes and blob images", () => {
    expect(read("src/components/applications/PdfPages.tsx")).toContain(
      "getDocument({ data })",
    );
    expect(view).toMatch(/<img\s+src=\{doc\.url\}/);
    expect(csp).toMatch(/img-src[^;]*blob:/);
  });
  it("offers review actions and a full-width narrow layout", () => {
    expect(view).toContain('data-testid="review-bar"');
    expect(view).toContain("Confirm reject");
    expect(view).toContain("FULL_WIDTH_BELOW = 900");
    expect(tab).toContain(
      'reviewFromPane(splitDoc.documentId as string, "accept")',
    );
    expect(tab).toContain("nextPendingAfter(");
  });
});
