// BF_PORTAL_AUDIT2_v778
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const app = readFileSync("src/App.tsx", "utf8");
describe("portal clean-up", () => {
  it("pages load on demand behind one Suspense; login screens stay immediate", () => {
    expect((app.match(/= lazy\(\(\) => import\("@\//g) ?? []).length).toBeGreaterThan(30);
    expect(app).toContain('import Login from "@/pages/Login";');
    expect(app).toContain('import Verify from "@/pages/Verify";');
    expect(app).toContain('data-testid="route-loading"');
  });
  it("the hidden admin pages that called missing server routes are gone", () => {
    for (const p of ['"/admin/ai"', '"/admin/analytics"', '"/admin/ai-policy"', '"/admin/ai/chats"', '"/admin/ai/issues"']) {
      expect(app).not.toContain(`path=${p}`);
    }
  });
});
