import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fileDownloadName } from "../downloadName";

describe("fileDownloadName", () => {
  it("uses the accepted name and keeps the original extension", () => {
    expect(fileDownloadName("Northern Gateway - Balance Sheet 2025", "scan_0042.PDF")).toBe("Northern Gateway - Balance Sheet 2025.pdf");
  });

  it("keeps an extension the accepted name already has", () => {
    expect(fileDownloadName("AR Aging.xlsx", "export.csv")).toBe("AR Aging.xlsx");
  });

  it("falls back to the MIME type for the extension", () => {
    expect(fileDownloadName("Void cheque", null, "image/jpeg")).toBe("Void cheque.jpg");
    expect(fileDownloadName("Void cheque", null, "application/pdf; charset=binary")).toBe("Void cheque.pdf");
  });

  it("removes characters a file system rejects", () => {
    expect(fileDownloadName('A/P: "June" <final>', "x.pdf")).toBe("A P June final.pdf");
  });

  it("falls back to the original name, then to document", () => {
    expect(fileDownloadName("", "bank-june.pdf")).toBe("bank-june.pdf");
    expect(fileDownloadName(null, null, null)).toBe("document");
  });
});

describe("documents tab wiring", () => {
  const tab = readFileSync(join(process.cwd(), "src/pages/applications/tabs/DocumentsTab.tsx"), "utf8");
  const pane = readFileSync(join(process.cwd(), "src/components/applications/DocumentSplitView.tsx"), "utf8");

  it("row and preview both download under the accepted name", () => {
    expect(tab).toContain("fileDownloadName(row?.displayName ?? row?.filename");
    expect(tab).toContain('data-testid="row-download"');
    expect(pane).toContain('data-testid="download-document"');
    expect(pane).toContain("fileDownloadName(downloadName ?? doc.filename, doc.originalFilename, doc.mimeType)");
  });

  it("groups A/P and A/R under Financial Statements", () => {
    const financialLine = tab.split("\n").find((line) => line.includes('id: "financials"')) ?? "";
    const financialMatch = /matches: \(c: string\) => (\/.*\/i)\.test\(c\)/.exec(financialLine);
    expect(financialMatch).toBeTruthy();
    const financials = new Function(`return ${financialMatch![1]};`)() as RegExp;
    for (const category of ["a/r", "a/p", "ar", "ap", "accounts receivable", "accounts_payable", "ar_aging", "ap aging report", "pnl – interim financials"]) {
      expect(financials.test(category)).toBe(true);
    }

    const bankingLine = tab.split("\n").find((line) => line.includes('id: "banking"')) ?? "";
    const bankingMatch = /matches: \(c: string\) => (\/.*\/i)\.test\(c\)/.exec(bankingLine);
    const banking = new Function(`return ${bankingMatch![1]};`)() as RegExp;
    expect(banking.test("financial_statements")).toBe(false);
    expect(banking.test("Financial Statements")).toBe(false);
    expect(banking.test("6 months business banking statements")).toBe(true);
    expect(banking.test("bank_statements")).toBe(true);
    expect(financials.test("financial_statements")).toBe(true);
    for (const category of ["6 months business banking statements", "2 pieces of government issued id", "void cheque or pad", "lease agreement (if applicable)", "business plan / projections"]) {
      expect(financials.test(category)).toBe(false);
    }
  });
});
