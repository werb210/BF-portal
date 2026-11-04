// BF_PORTAL_IPAD_ONLY_v421
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

// BF_ANDROID_STAFF_v1 - the Android staff app (phones and tablets) is now a supported build; on iOS the portal stays
// iPad-only (the iPhone has the dialler app).
describe("v421 Portal is never packaged for iPhone; Android is the staff app", () => {
  it("has the Android project and the Capacitor Android platform", () => {
    expect(existsSync(path.join(root, "android", "app", "build.gradle"))).toBe(true);
    expect(read("package.json")).toContain('"@capacitor/android"');
  });

  it("both iOS targets stay iPad-only", () => {
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(pbx).toContain('TARGETED_DEVICE_FAMILY = "2"');
    expect(pbx).not.toContain('TARGETED_DEVICE_FAMILY = "1,2"');
    expect(pbx).not.toContain('TARGETED_DEVICE_FAMILY = "1"');
  });
});
