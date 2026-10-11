import { describe, it, expect } from "vitest";
import { access } from "node:fs/promises";

describe("OCR boundary - portal is display-only", () => {
  it("src/ocr/ processing modules do not exist", async () => {
    await expect(access("src/ocr/ocrExtractor.ts")).rejects.toThrow();
    await expect(access("src/ocr/ocrComparator.ts")).rejects.toThrow();
    await expect(access("src/ocr/OCR_FIELD_REGISTRY.ts")).rejects.toThrow();
  });

  // BF_PORTAL_UNUSED_FILES_v784 - the unused src/api/ocr.ts client is gone too.
  it("there is no local OCR API module", async () => {
    await expect(access("src/api/ocr.ts")).rejects.toThrow();
  });
});
