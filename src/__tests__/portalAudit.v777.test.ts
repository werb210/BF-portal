// BF_PORTAL_AUDIT_v777
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");
describe("portal audit fixes", () => {
  it("the login code screen declares its effect before the early return", () => {
    const s = read("src/pages/Verify.tsx");
    expect(s.indexOf("useEffect(() => {")).toBeLessThan(s.indexOf('return <Navigate to="/login" replace />'));
  });
  it("Operations declares its effect before the admin check returns", () => {
    const s = read("src/pages/admin/Operations.tsx");
    expect(s.indexOf("useEffect(() => {")).toBeLessThan(s.indexOf('return <Navigate to="/" replace />'));
  });
  it("lint can read TypeScript and checks the rules of hooks, in CI", () => {
    expect(read(".eslintrc.cjs")).toContain('parser: "@typescript-eslint/parser"');
    expect(read(".eslintrc.cjs")).toContain('"react-hooks/rules-of-hooks": "error"');
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("npm run lint");
    expect(ci).toContain("npm run typecheck:all");
  });
});
