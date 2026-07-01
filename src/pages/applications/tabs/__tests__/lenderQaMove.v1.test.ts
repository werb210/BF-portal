import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

const qa = read("../LenderQaSection.tsx");
const lenders = read("../LendersTab.tsx");
const request = read("../RequestItemsTab.tsx");

describe("lender Q&A move + readability", () => {
  it("question prompt and title have explicit text color", () => {
    expect(qa).toContain('qPrompt: { fontWeight: 600, fontSize: 14, color:');
    expect(qa).toContain('title: { fontSize: 18, fontWeight: 700, color:');
  });
  it("builder no longer mounts on the Lenders tab", () => {
    expect(lenders).not.toContain("<LenderQaSection");
  });
  it("builder now mounts on the Request Items tab", () => {
    expect(request).toContain("<LenderQaSection applicationId={applicationId} />");
  });
});
