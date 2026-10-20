// BF_PORTAL_v837_NO_OCR_LABEL - documents that are never OCR'd (signed SBA forms, signed applications, Other) say
// "No OCR needed" instead of "OCR queued".
import { describe, expect, it } from "vitest";
import { ocrLabel } from "../DocumentsTab";

describe("OCR label on a document", () => {
  it("says a skipped document needs no OCR", () => {
    expect(ocrLabel("skipped")).toBe("No OCR needed");
    expect(ocrLabel("SKIPPED")).toBe("No OCR needed");
  });
  it("keeps the other states", () => {
    expect(ocrLabel("completed")).toBe("OCR ✓");
    expect(ocrLabel("failed")).toBe("OCR failed");
    expect(ocrLabel("processing")).toBe("OCR processing…");
    expect(ocrLabel("pending")).toBe("OCR queued");
    expect(ocrLabel(null)).toBeNull();
  });
});
