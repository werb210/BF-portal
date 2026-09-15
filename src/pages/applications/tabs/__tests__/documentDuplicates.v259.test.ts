// BF_PORTAL_DOCUMENT_DUPLICATE_BADGES_v259
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildDuplicateIndex, duplicateBadgeText, extraCopyIds, parseDuplicateGroups } from "../documentDuplicates";

const voss = {
  status: "ok",
  data: {
    groups: [{
      hash: "h1",
      original: { id: "d1", category: "Balance Sheet – Interim financials", filename: "Voss Events Balance Sheet - 4.30.26 (1).pdf", status: "pending" },
      copies: [
        { id: "d2", category: "A/P", filename: "Voss Events Balance Sheet - 4.30.26 (1).pdf", status: "pending" },
        { id: "d3", category: "other", filename: "Voss Events Balance Sheet - 4.30.26 (1).pdf", status: "pending" },
        { id: "d4", category: "A/R", filename: "Voss Events Balance Sheet - 4.30.26 (1).pdf", status: "pending" },
      ],
    }],
  },
};

describe("duplicate groups from the server", () => {
  it("badges every copy against the original and never the original itself", () => {
    const groups = parseDuplicateGroups(voss);
    const index = buildDuplicateIndex(groups);
    expect(Object.keys(index).sort()).toEqual(["d2", "d3", "d4"]);
    expect(index.d1).toBeUndefined();
    expect(duplicateBadgeText(index.d2)).toBe("Duplicate of Voss Events Balance Sheet - 4.30.26 (1).pdf (Balance Sheet – Interim financials)");
    expect(extraCopyIds(groups)).toEqual(["d2", "d3", "d4"]);
  });
  it("tolerates an unwrapped response, an empty one, or an older server", () => {
    expect(parseDuplicateGroups(voss.data)).toHaveLength(1);
    expect(parseDuplicateGroups({ groups: [] })).toEqual([]);
    expect(parseDuplicateGroups(undefined)).toEqual([]);
  });
});

describe("wiring", () => {
  const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
  it("loads duplicates with the documents, badges rows, and lets admins remove copies", () => {
    expect(tab).toContain("/api/documents/${applicationId}/duplicates");
    expect(tab).toContain("duplicateOf={duplicateOf[doc.documentId]}");
    expect(tab).toContain('data-testid="duplicate-badge"');
    expect(tab).toContain("Remove duplicate copies");
    expect(tab).toContain("api.delete(`/api/documents/${applicationId}/documents/${id}`)");
  });
});
