// BF_PORTAL_FACE_ID_v243
// Face ID / Touch ID re-entry for an already signed-in staff session. SMS OTP
// stays the primary sign-in; this only guards returning to the app.
// Implemented as an app-target Swift plugin (BorealBridgeViewController.swift)
// so no new npm/SPM dependency is needed.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type BiometryStatus = { available: boolean; biometryType: "faceID" | "touchID" | "opticID" | "none" };

export interface BiometricUnlockPlugin {
  status(): Promise<BiometryStatus>;
  authenticate(options: { reason: string }): Promise<{ ok: boolean }>;
}

export const BiometricUnlock = registerPlugin<BiometricUnlockPlugin>("BiometricUnlock");

/** Locked after this long in the background. Short app switches do not re-prompt. */
export const LOCK_AFTER_MS = 60_000;

export function shouldLock(input: {
  native: boolean;
  hasSession: boolean;
  biometryAvailable: boolean;
  backgroundedAt: number | null;
  now: number;
  coldStart: boolean;
}): boolean {
  if (!input.native || !input.hasSession || !input.biometryAvailable) return false;
  if (input.coldStart) return true;
  if (input.backgroundedAt === null) return false;
  return input.now - input.backgroundedAt >= LOCK_AFTER_MS;
}

export function isNativeIos(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function biometryLabel(type: BiometryStatus["biometryType"]): string {
  if (type === "touchID") return "Touch ID";
  if (type === "opticID") return "Optic ID";
  return "Face ID";
}
