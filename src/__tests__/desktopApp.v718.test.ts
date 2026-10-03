// BF_PORTAL_DESKTOP_APP_v718
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const main = readFileSync("desktop/main.cjs", "utf8");
const pkg = JSON.parse(readFileSync("desktop/package.json", "utf8"));
const wf = readFileSync(".github/workflows/desktop.yml", "utf8");

describe("Boreal Staff for Windows", () => {
  it("loads the staff portal and keeps the dialler alive when hidden", () => {
    expect(main).toContain('"https://staff.boreal.financial"');
    expect(main).toContain("backgroundThrottling: false");
  });
  it("closing the window hides it to the tray; only Quit exits", () => {
    expect(main).toContain("if (KEEP_ALIVE && !quitting) { event.preventDefault(); mainWindow.hide(); }"); // BF_PORTAL_DESKTOP_MAC_v723: Windows and Mac
    expect(main).toContain("new Tray(");
  });
  it("runs once, starts at Windows sign-in hidden, and updates itself", () => {
    expect(main).toContain("app.requestSingleInstanceLock()");
    expect(pkg.build.mac.target[0].target).toBe("dmg");
    expect(main).toContain('app.setLoginItemSettings({ openAtLogin: true, args: ["--hidden"] })');
    expect(main).toContain("autoUpdater.checkForUpdatesAndNotify()");
    expect(pkg.build.publish[0]).toMatchObject({ provider: "github", owner: "werb210", repo: "BF-portal" });
  });
  it("allows portal permissions and opens other links in the browser", () => {
    expect(main).toContain("GRANTED_PERMISSIONS.has(permission)");
    expect(main).toContain("shell.openExternal(url)");
  });
  it("is built on Windows by a manual workflow that publishes a release", () => {
    expect(wf).toContain("runs-on: windows-latest");
    expect(wf).toContain("workflow_dispatch:");
    expect(wf).toContain("npm run dist:win");
    expect(pkg.build.win.target[0].target).toBe("nsis");
  });
});
