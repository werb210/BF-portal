// BF_PORTAL_DESKTOP_MAC_v723
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const main = readFileSync("desktop/main.cjs", "utf8");
const pkg = JSON.parse(readFileSync("desktop/package.json", "utf8"));
const wf = readFileSync(".github/workflows/desktop.yml", "utf8");

describe("Boreal Staff Portal for Mac", () => {
  it("keeps the dialler alive when the window is closed, like Windows", () => {
    expect(main).toContain("const KEEP_ALIVE = IS_WIN || IS_MAC;");
    expect(main).toContain("if (!KEEP_ALIVE) app.quit();");
  });
  it("has a menu-bar icon, starts at login hidden, and the dock reopens it", () => {
    expect(main).toContain("app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });");
    expect(main).toContain('label: "Quit (calls stop ringing on this Mac)"');
    expect(main).toContain("if (KEEP_ALIVE) { showWindow(); return; }");
  });
  it("is built for Apple-chip and Intel Macs by the same workflow, as a download", () => {
    expect(pkg.build.mac.target[0].arch).toEqual(["arm64", "x64"]);
    expect(wf).toContain("runs-on: macos-latest");
    expect(wf).toContain("npm run dist:mac");
    expect(wf).toContain("name: Boreal-Staff-Portal-Mac");
  });
  it("keeps the microphone description macOS requires for calls", () => {
    expect(pkg.build.mac.extendInfo.NSMicrophoneUsageDescription).toContain("microphone");
  });
});
