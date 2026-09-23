// BF_PORTAL_IPAD_ONLY_v421
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

describe("v421 Portal cannot be packaged for Android or iPhone", () => {
  it("has no android platform directory", () => {
    expect(existsSync(path.join(root, "android"))).toBe(false);
  });

  it("does not depend on @capacitor/android", () => {
    expect(read("package.json")).not.toContain("@capacitor/android");
  });

  it("the capacitor config declares no android platform", () => {
    const cfg = read("capacitor.config.ts");
    expect(cfg).not.toContain("androidScheme");
    expect(cfg).not.toMatch(/\bandroid:\s*\{/);
  });

  it("both iOS targets stay iPad-only", () => {
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(pbx).toContain('TARGETED_DEVICE_FAMILY = "2"');
    expect(pbx).not.toContain('TARGETED_DEVICE_FAMILY = "1,2"');
    expect(pbx).not.toContain('TARGETED_DEVICE_FAMILY = "1"');
  });
});
