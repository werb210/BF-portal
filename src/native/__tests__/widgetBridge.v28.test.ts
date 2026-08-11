// BF_PORTAL_WIDGET_BRIDGE_v28
import { describe, expect, it, vi, beforeEach } from "vitest";

const setSpy = vi.fn();
const removeSpy = vi.fn();
const configureSpy = vi.fn();
let platform = "ios";
let native = true;

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => native,
    getPlatform: () => platform,
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    configure: (...args: unknown[]) => { configureSpy(...args); return Promise.resolve(); },
    set: (...args: unknown[]) => { setSpy(...args); return Promise.resolve(); },
    remove: (...args: unknown[]) => { removeSpy(...args); return Promise.resolve(); },
  },
}));

const load = async () => await import("../widgetBridge");

beforeEach(() => {
  vi.clearAllMocks();
  platform = "ios";
  native = true;
});

describe("the token reaches the widget's shared store", () => {
  it("writes into the App Group suite, not the app's private defaults", async () => {
    const { mirrorTokenToWidget, WIDGET_GROUP } = await load();
    await mirrorTokenToWidget("jwt-123");
    expect(configureSpy).toHaveBeenCalledWith({ group: WIDGET_GROUP });
    expect(setSpy).toHaveBeenCalledWith({ key: "widget_auth_token", value: "jwt-123" });
  });

  it("removes it on sign-out rather than leaving a live token behind", async () => {
    const { mirrorTokenToWidget } = await load();
    await mirrorTokenToWidget(null);
    expect(removeSpy).toHaveBeenCalledWith({ key: "widget_auth_token" });
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("mirrors the active business too, since a tile has no switcher", async () => {
    const { mirrorSiloToWidget } = await load();
    await mirrorSiloToWidget("BI");
    expect(setSpy).toHaveBeenCalledWith({ key: "widget_active_silo", value: "BI" });
  });
});

describe("it is inert everywhere a widget cannot exist", () => {
  it("does nothing in a browser", async () => {
    native = false;
    const { mirrorTokenToWidget } = await load();
    await mirrorTokenToWidget("jwt-123");
    expect(setSpy).not.toHaveBeenCalled();
    expect(configureSpy).not.toHaveBeenCalled();
  });

  it("does nothing on Android", async () => {
    platform = "android";
    const { mirrorTokenToWidget } = await load();
    await mirrorTokenToWidget("jwt-123");
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe("signing in cannot fail because of the widget", () => {
  it("swallows a native failure instead of rejecting", async () => {
    const { mirrorTokenToWidget } = await load();
    configureSpy.mockImplementationOnce(() => { throw new Error("no such group"); });
    await expect(mirrorTokenToWidget("jwt-123")).resolves.toBeUndefined();
  });

  it("the auth module does not await the mirror", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const src = readFileSync(path.join(process.cwd(), "src/lib/authToken.ts"), "utf8");
    expect(src).toContain("void mirrorTokenToWidget(token);");
    expect(src).toContain("void mirrorTokenToWidget(null);");
    expect(src).not.toContain("await mirrorTokenToWidget");
  });
});
