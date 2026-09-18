// BF_PORTAL_REMOVE_DEAD_AIKNOWLEDGE_v348
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("dead AI knowledge upload page stays removed", () => {
  it("AIKnowledge.tsx is gone and the live manager remains", () => {
    const admin = join(__dirname, "..");
    expect(existsSync(join(admin, "AIKnowledge.tsx"))).toBe(false);
    expect(existsSync(join(admin, "AIKnowledgeManager.tsx"))).toBe(true);
  });
});
