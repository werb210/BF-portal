// BF_PORTAL_DOC_UPLOAD_MOVE_v316
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/api", () => ({ api: Object.assign(vi.fn(), { post: vi.fn(), get: vi.fn(), delete: vi.fn() }) }));
import { isDuplicateUploadError, moveTargets, uploadSummary } from "../DocumentsTab";

describe("bulk upload", () => {
  it("treats an already-uploaded file as skipped, not failed", () => {
    expect(isDuplicateUploadError({ status: 409 })).toBe(true);
    expect(isDuplicateUploadError({ status: 500, message: "UPLOAD_FAILED" })).toBe(false);
    expect(uploadSummary(7, ["BalanceSheet.pdf", "CAA Contracts.pdf"], [])).toBe("5 of 7 uploaded. 2 skipped - already on this application: BalanceSheet.pdf, CAA Contracts.pdf.");
    expect(uploadSummary(3, [], ["big.pdf: too large"])).toBe("2 of 3 uploaded. Failed: big.pdf: too large.");
  });

  it("accepts Numbers files", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain('\".numbers\"');
    expect(tab).toContain(".numbers,.xls,.csv,.doc,.heic");
  });
});

describe("move to category", () => {
  it("offers every other category", () => {
    const targets = moveTargets("A/R");
    expect(targets).not.toContain("A/R");
    expect(targets).toContain("6 months business banking statements");
  });
  it("is on each document row and calls the server", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain('data-testid="doc-move"');
    expect(tab).toContain("/category`, { category }");
  });
});
