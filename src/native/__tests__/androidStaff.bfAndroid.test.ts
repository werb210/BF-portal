// BF_ANDROID_STAFF_v1 - the Android staff app: the page hands calls to the Android dialler (a separate app,
// boreal-dialer-ios android/) and never rings itself, push tokens go up as "portal-android", the shortcuts and alerts arrive
// as launch routes, and the Android project carries no calling engine of its own (no duplicate of the dialler).
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  platform: "android" as string,
  post: vi.fn(async (_url: string, _body: unknown) => ({ ok: true })),
  canOpen: true,
  opened: [] as string[],
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => h.platform,
    isNativePlatform: () => h.platform !== "web",
    isPluginAvailable: (name: string) => name !== "BorealVoice",
  },
  registerPlugin: () => ({}),
}));
vi.mock("@capacitor/app-launcher", () => ({
  AppLauncher: {
    canOpenUrl: vi.fn(async () => ({ value: h.canOpen })),
    openUrl: vi.fn(async ({ url }: { url: string }) => { h.opened.push(url); return { completed: true }; }),
  },
}));
vi.mock("@/api", () => ({ api: Object.assign(vi.fn(async () => ({})), { post: h.post }) }));

import { dialerAppTakesIncoming, jsDeviceRegistersForIncoming, nativeVoiceAvailable } from "@/native/portalVoip";
import { borealDialerUrl, launchNativeBorealDialer } from "@/native/dialerLauncher";
import { isFcmToken, pushTokenBody, registerPortalPushToken } from "@/native/portalPushToken";
import { launcherAvailable, parseLaunchRoute } from "@/native/portalLauncher";
import { biometryLabel, isNativeIos } from "@/native/biometricLockPolicy";
import { isNativeWorkstation } from "@/native/ipadWorkstation";

const FCM = "dK3x9_aB-12:APA91b" + "Hk7_Qw-3".repeat(18);
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

beforeEach(() => {
  h.platform = "android";
  h.canOpen = true;
  h.opened = [];
  h.post.mockClear();
});

describe("calls in the Android staff app go to the Android dialler", () => {
  it("opens the dialler with the link it registers", async () => {
    expect(borealDialerUrl({ phone: "+14035550199" })).toBe("borealdialer://call?phone=%2B14035550199");
    expect(await launchNativeBorealDialer({ phone: "+14035550199" })).toBe(true);
    expect(h.opened).toEqual(["borealdialer://call?phone=%2B14035550199"]);
  });

  it("falls back to the page's own dialler when the Android dialler is not installed", async () => {
    h.canOpen = false;
    expect(await launchNativeBorealDialer({ phone: "+14035550199" })).toBe(false);
    expect(h.opened).toEqual([]);
  });

  it("the page never registers for incoming calls on Android, so one phone never rings twice", () => {
    expect(nativeVoiceAvailable()).toBe(false);
    expect(dialerAppTakesIncoming("android", true)).toBe(true);
    expect(dialerAppTakesIncoming("ios", true)).toBe(false);
    expect(dialerAppTakesIncoming("android", false)).toBe(false); // Chrome on an Android phone: the web portal as before
    expect(jsDeviceRegistersForIncoming({ platform: "ios", pluginAvailable: true, nativeRegistered: true })).toBe(false);
  });

  it("the Android project has no calling engine of its own", () => {
    const gradle = read("android/app/build.gradle");
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(gradle).not.toContain("com.twilio");
    expect(manifest).not.toContain("ConnectionService");
    expect(manifest).not.toContain("MANAGE_OWN_CALLS");
    expect(manifest).toContain('android:scheme="borealdialer"'); // <queries>: lets canOpenUrl see the dialler
    expect(gradle).toContain("applicationId     : 'com.boreal.portal'");
  });
});

describe("push alerts in the Android staff app", () => {
  it("recognises FCM tokens and sends them as portal-android", async () => {
    expect(isFcmToken(FCM)).toBe(true);
    expect(isFcmToken("ab".repeat(32))).toBe(false);
    expect(isFcmToken("has spaces " + FCM)).toBe(false);
    expect(pushTokenBody(` ${FCM} `, "android")).toEqual({ token: FCM, app: "portal-android", environment: "production" });
    expect(await registerPortalPushToken(FCM)).toBe(true);
    expect(h.post).toHaveBeenCalledWith("/api/staff/push-token", { token: FCM, app: "portal-android", environment: "production" });
  });

  it("does not send an APNs-looking token from Android", async () => {
    expect(await registerPortalPushToken("ab".repeat(32))).toBe(false);
    expect(h.post).not.toHaveBeenCalled();
  });

  it("leaves call and message alerts to the dialler when it is on the same phone", () => {
    const notifier = read("android/app/src/main/java/com/boreal/portal/StaffAlertNotifier.java");
    expect(notifier).toContain('return "TASK".equals(category) || !dialerOnPhone;');
  });
});

describe("launch routes and shared native pieces", () => {
  it("shortcuts and tapped alerts arrive as in-portal routes", () => {
    expect(launcherAvailable()).toBe(true);
    expect(parseLaunchRoute("/communications")).toEqual({ path: "/communications" });
    expect(parseLaunchRoute("//evil.example")).toBeNull();
  });

  it("biometric lock and the workstation plugin are on for Android", () => {
    expect(isNativeIos()).toBe(true);
    expect(isNativeWorkstation()).toBe(true);
    expect(biometryLabel("biometric")).toBe("fingerprint or face");
    h.platform = "web";
    expect(isNativeIos()).toBe(false);
    expect(isNativeWorkstation()).toBe(false);
  });
});
