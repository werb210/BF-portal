import { describe, it, expect } from "vitest";
import { access } from "node:fs/promises";

describe("OCR boundary — portal is display-only", () => {
  it("fetchOcrInsights is a server call, not local processing", async () => {
    const { fetchOcrInsights } = await import("@/api/ocr");
    expect(typeof fetchOcrInsights).toBe("function");

    const src = fetchOcrInsights.toString();
    expect(src).not.toContain("regex");
    expect(src).not.toContain("match(");
    expect(src).not.toContain("ocrRuns");
  });

  it("fetchOcrResults is a server call", async () => {
    const { fetchOcrResults } = await import("@/api/ocr");
    expect(typeof fetchOcrResults).toBe("function");
  });

  it("src/ocr/ processing modules do not exist", async () => {
    await expect(access("src/ocr/ocrExtractor.ts")).rejects.toThrow();
    await expect(access("src/ocr/ocrComparator.ts")).rejects.toThrow();
    await expect(access("src/ocr/OCR_FIELD_REGISTRY.ts")).rejects.toThrow();
  });

  it("extractDocumentOcr is not exported from the API layer", async () => {
    const ocrApi = await import("@/api/ocr");

    expect((ocrApi as Record<string, unknown>).extractDocumentOcr).toBeUndefined();
    expect((ocrApi as Record<string, unknown>).runOcrExtraction).toBeUndefined();
    expect((ocrApi as Record<string, unknown>).compareOcrResults).toBeUndefined();
  });
});
