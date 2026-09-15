// BF_PORTAL_NEXT_ACTIONS_IMPORT_v212
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cmp = readFileSync("src/components/dashboard/NextActions.tsx", "utf-8");
const lib = readFileSync("src/lib/api.ts", "utf-8");

describe("the import that broke the build", () => {
  it("takes api from the module that exports it", () => {
    expect(cmp).toContain('import { api } from "@/api"');
    expect(cmp).not.toContain('from "@/lib/api"');
  });

  it("confirms @/lib/api really does not export api", () => {
    // If this ever starts failing, the two modules have converged and the
    // original import would have been fine - worth knowing either way.
    expect(lib).not.toMatch(/^export (const|function) api\b/m);
  });

  it("matches how the sibling dashboard cards import it", () => {
    const dashboard = readFileSync("src/api/dashboard.ts", "utf-8");
    expect(dashboard).toContain('import { api } from "@/api"');
  });

  it("no dashboard component imports from @/lib/api at all", () => {
    const dir = "src/components/dashboard";
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".tsx"))) {
      expect(readFileSync(`${dir}/${f}`, "utf-8")).not.toContain('from "@/lib/api"');
    }
  });
});
