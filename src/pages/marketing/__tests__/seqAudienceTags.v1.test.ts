// BF_PORTAL_SEQ_AUDIENCE_TAGS_v1
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src/pages/marketing/MarketingDashboard.tsx"), "utf8");

describe("sequence audience tags v1", () => {
  it("offers include and exclude tag lists with audience guidance", () => {
    expect(src).toContain("Include tags");
    expect(src).toContain("None selected = all contacts");
    expect(src).toContain("Exclude tags");
    expect(src).toContain("Removed even if included");
  });

  it("posts both tag arrays and resets them after save", () => {
    expect(src).toContain("includeTags,");
    expect(src).toContain("excludeTags,");
    expect(src).toContain("setIncludeTags([])");
    expect(src).toContain("setExcludeTags([])");
  });

  it("shows the segment count in each list", () => {
    expect(src.match(/<span>\{s\.tag\} \(\{s\.n\}\)<\/span>/g)).toHaveLength(2);
  });
});
