// BF_PORTAL_FACE_ID_v243
// Face ID / Touch ID re-entry for an already signed-in staff session. SMS OTP
// stays the primary sign-in; this only guards returning to the app.
// Implemented as an app-target Swift plugin (BorealBridgeViewController.swift)
// so no new npm/SPM dependency is needed.
import { Capacitor, registerPlugin } from "@capacitor/core";

// BF_ANDROID_STAFF_v1 - Android reports "biometric" (BiometricPrompt: fingerprint or face, whichever the phone has).
export type BiometryStatus = { available: boolean; biometryType: "faceID" | "touchID" | "opticID" | "biometric" | "none" };

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

/** The iPad or Android staff app (both have the BiometricUnlock plugin). */
export function isNativeIos(): boolean {
  try {
    const platform = Capacitor.getPlatform();
    return Capacitor.isNativePlatform() && (platform === "ios" || platform === "android");
  } catch {
    return false;
  }
}

export function biometryLabel(type: BiometryStatus["biometryType"]): string {
  if (type === "touchID") return "Touch ID";
  if (type === "opticID") return "Optic ID";
  if (type === "biometric") return "fingerprint or face";
  return "Face ID";
}
