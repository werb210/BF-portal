// BF_PORTAL_FACE_ID_v243
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { biometryLabel, LOCK_AFTER_MS, shouldLock } from "../biometricLock";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const base = { native: true, hasSession: true, biometryAvailable: true, backgroundedAt: null, now: 1_000_000, coldStart: false };

describe("when the portal locks", () => {
  it("locks a signed-in session on cold start", () => {
    expect(shouldLock({ ...base, coldStart: true })).toBe(true);
  });
  it("locks after a minute in the background, not after a quick app switch", () => {
    expect(shouldLock({ ...base, backgroundedAt: base.now - LOCK_AFTER_MS })).toBe(true);
    expect(shouldLock({ ...base, backgroundedAt: base.now - 5_000 })).toBe(false);
  });
  it("never locks on the web, when signed out, or without biometry", () => {
    expect(shouldLock({ ...base, native: false, coldStart: true })).toBe(false);
    expect(shouldLock({ ...base, hasSession: false, coldStart: true })).toBe(false);
    expect(shouldLock({ ...base, biometryAvailable: false, coldStart: true })).toBe(false);
  });
  it("names the right sensor", () => {
    expect(biometryLabel("touchID")).toBe("Touch ID");
    expect(biometryLabel("faceID")).toBe("Face ID");
  });
});

describe("native wiring", () => {
  const swift = read("ios/App/App/BorealBridgeViewController.swift");
  it("registers the plugin with the bridge, alongside the existing ones", () => {
    expect(swift).toContain("registerPluginInstance(BiometricUnlockPlugin())");
    expect(swift).toContain("registerPluginInstance(IPadWorkstationPlugin())");
    expect(swift).toContain('jsName = "BiometricUnlock"');
  });
  it("falls back to the device passcode", () => {
    expect(swift).toContain(".deviceOwnerAuthentication,");
  });
  it("declares the Face ID usage string", () => {
    expect(read("ios/App/App/Info.plist")).toContain("<key>NSFaceIDUsageDescription</key>");
  });
  it("is mounted and offers the OTP sign-in escape hatch", () => {
    expect(read("src/App.tsx")).toContain("<BiometricLock />");
    expect(read("src/native/BiometricLock.tsx")).toContain("Sign in with a code instead");
  });
});
