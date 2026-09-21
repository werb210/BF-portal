// BF_PORTAL_WIDGET_SELF_REFRESH_v384
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  native: true,
  setWidgetSession: vi.fn(async () => {}),
  clearWidgetSession: vi.fn(async () => {}),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => "ios" },
  registerPlugin: () => ({ setWidgetSession: h.setWidgetSession, clearWidgetSession: h.clearWidgetSession }),
}));

import { syncWidgetSession } from "../widgetBridge";

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");

beforeEach(() => { vi.clearAllMocks(); h.native = true; });

describe("background widget session", () => {
  it("hands the token to the app when signed in", async () => {
    await syncWidgetSession("jwt", "https://server.boreal.financial");
    expect(h.setWidgetSession).toHaveBeenCalledWith({ token: "jwt", apiBase: "https://server.boreal.financial" });
  });
  it("clears it when signed out or the base is not https", async () => {
    await syncWidgetSession(null, "https://server.boreal.financial");
    await syncWidgetSession("jwt", "http://localhost:8080");
    expect(h.clearWidgetSession).toHaveBeenCalledTimes(2);
    expect(h.setWidgetSession).not.toHaveBeenCalled();
  });
  it("does nothing on the web", async () => {
    h.native = false;
    await syncWidgetSession("jwt", "https://server.boreal.financial");
    expect(h.setWidgetSession).not.toHaveBeenCalled();
    expect(h.clearWidgetSession).not.toHaveBeenCalled();
  });
});

describe("native wiring", () => {
  const plugin = read("ios", "App", "App", "WidgetBridgePlugin.swift");
  const delegate = read("ios", "App", "App", "AppDelegate.swift");
  const plist = read("ios", "App", "App", "Info.plist");
  it("keeps the token in the app's Keychain, not the App Group", () => {
    expect(plugin).toContain("kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly");
    expect(plugin).not.toMatch(/kSecAttrAccessGroup/);
    expect(plugin).not.toContain('forKey: "widget_auth_token"');
  });
  it("registers, schedules and permits the refresh task", () => {
    expect(delegate).toContain("WidgetBackgroundRefresh.register()");
    expect(delegate).toContain("func sceneDidEnterBackground(_ scene: UIScene)");
    expect(plist).toContain("<string>com.boreal.portal.widget-refresh</string>");
    expect(plist).toContain("<key>UIBackgroundModes</key>");
    expect(plugin).toContain('static let taskId = "com.boreal.portal.widget-refresh"');
  });
  it("only refreshes fields the summary call owns and stops on 401", () => {
    expect(plugin).toContain('for field in ["tasksDueToday", "unreadMessages"]');
    expect(plugin).toContain('if silo == "BF", let value = fresh["commissionEarned"]');
    expect(plugin).toContain("guard !stored.isEmpty else { return nil }");
    expect(plugin).toContain("http.statusCode == 401 || http.statusCode == 403");
  });
  it("the widget extension stays display-only", () => {
    const root = ["ios", "App", "BorealWidget"];
    const widget = ["SummaryWidget.swift", "WidgetSummary.swift", "SummaryProvider.swift"].map((f) => read(...root, f)).join("\n");
    for (const forbidden of ["Authorization", "Bearer", "URLSession", "SecItem"]) expect(widget).not.toContain(forbidden);
  });
});
