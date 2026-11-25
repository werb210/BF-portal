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
  // BF_PORTAL_WIDGET_SELF_REFRESH_v2 - Keychain shared only with this app's own widget (an access group), never the App Group.
  it("keeps the token in a Keychain group shared only with the widget, not the App Group", () => {
    expect(plugin).toContain("kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly");
    expect(plugin).toContain('static let accessGroup = "76VAY7UJKJ.com.borealfinancial.portal.widget"');
    for (const f of ["BorealWidget/BorealWidget.entitlements", "App/App.entitlements"]) expect(read("ios", "App", ...f.split("/"))).toContain("$(AppIdentifierPrefix)com.borealfinancial.portal.widget");
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
    expect(plugin).toContain('for field in ["tasksDueToday", "unreadMessages", "tasksOverdue"]');
    expect(plugin).toContain('if silo == "BF", let value = fresh["commissionEarned"]');
    expect(plugin).toContain("guard !stored.isEmpty else { return nil }");
    expect(plugin).toContain("http.statusCode == 401 || http.statusCode == 403");
  });
  it("the widget refreshes itself every 15 minutes, keeping the app's pipeline count", () => {
    const widget = read("ios", "App", "BorealWidget", "SummaryProvider.swift");
    expect(widget).toContain("await WidgetLiveRefresh.refresh(silo: configuration.silo.silo)");
    expect(widget).toContain("byAdding: .minute, value: 15");
    expect(widget).toContain('kSecAttrAccessGroup as String: accessGroup');
    expect(widget).not.toMatch(/"pipelineCount", "tasksDueToday", "unreadMessages"\]/);
    expect(widget).toContain('guard fresh["kind"] as? String == "keystone" else { return nil }');
  });
});
