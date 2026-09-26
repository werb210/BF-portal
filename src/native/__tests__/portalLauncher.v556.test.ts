// BF_PORTAL_BLOCK_v556
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deliverMaya, parseLaunchRoute, spotlightItems, takePendingMaya } from "../portalLauncher";

describe("v556 Siri and Spotlight", () => {
  it("accepts in-app paths and Maya commands only", () => {
    expect(parseLaunchRoute("/pipeline")).toEqual({ path: "/pipeline" });
    expect(parseLaunchRoute("/tasks?view=due_today")).toEqual({ path: "/tasks?view=due_today" });
    expect(parseLaunchRoute("maya:open the newest application")).toEqual({ maya: "open the newest application" });
    expect(parseLaunchRoute("//evil.example.com")).toBeNull();
    expect(parseLaunchRoute("https://evil.example.com")).toBeNull();
    expect(parseLaunchRoute("maya:   ")).toBeNull();
    expect(parseLaunchRoute("")).toBeNull();
  });
  it("hands a Maya command over once", () => {
    deliverMaya("call this client");
    expect(takePendingMaya()).toBe("call this client");
    expect(takePendingMaya()).toBeNull();
  });
  it("indexes applications by business name and opens them", () => {
    expect(spotlightItems([
      { id: "a1", business_legal_name: "Todd's Gym", pipeline_state: "In Review" },
      { id: "a2", name: null, business_legal_name: null },
    ])).toEqual([{ route: "/applications/a1", title: "Todd's Gym", subtitle: "Application - In Review" }]);
  });
  it("has native wiring", () => {
    const swift = readFileSync("ios/App/App/AppDelegate.swift", "utf-8");
    expect(swift).toContain("struct BorealPortalShortcuts: AppShortcutsProvider");
    expect(swift).toContain("if PortalLaunch.handle(userActivity) { return true }");
    expect(readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf-8")).not.toContain("IPHONEOS_DEPLOYMENT_TARGET = 15.0;");
    expect(readFileSync("ios/App/App/BorealBridgeViewController.swift", "utf-8")).toContain("registerPluginInstance(PortalLauncherPlugin())");
    expect(readFileSync("src/App.tsx", "utf-8")).toContain("<PortalLauncherProvider />");
    expect(readFileSync("src/components/maya/MayaCommandBar.tsx", "utf-8")).toContain("window.addEventListener(MAYA_EVENT, onMaya)");
  });
});
