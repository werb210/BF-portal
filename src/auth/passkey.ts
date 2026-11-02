// BF_PORTAL_WEBAUTHN_v1 — passkey helpers.
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { setAuthToken } from "@/lib/authToken";
import { captureRefreshToken } from "@/auth/sessionRefresh"; // BF_PORTAL_v868_SLIDING_REFRESH
import { api } from "@/api";
import { Capacitor, registerPlugin } from "@capacitor/core";

// BF_PORTAL_v864_NATIVE_PASSKEYS - in the iPad app (and the same app on an Apple silicon Mac, "Designed for iPad")
// the page runs from capacitor://localhost, so WebKit's WebAuthn is missing or refuses staff.boreal.financial and
// the passkey button never showed. There, passkeys go through the app's native plugin (Apple's passkey API, see
// ios/App/App/BorealBridgeViewController.swift NativePasskeyPlugin), which answers in the same JSON shape.
type NativeCredential = Record<string, unknown>;
type NativePasskeyPlugin = {
  status(): Promise<{ available: boolean; onMac: boolean }>;
  register(o: { rpId: string; challenge: string; userId: string; userName: string; excludeCredentials?: Array<{ id: string }> }): Promise<NativeCredential>;
  authenticate(o: { rpId: string; challenge: string; allowCredentials?: Array<{ id: string }> }): Promise<NativeCredential>;
};
export const NativePasskey = registerPlugin<NativePasskeyPlugin>("NativePasskey");

/** True inside the iOS / iPadOS app (also when it runs on a Mac) when the build has the native passkey plugin. */
export function nativePasskeysAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("NativePasskey");
  } catch {
    return false;
  }
}

/** Native errors as the browser's names, so the screens treat a cancel the same way everywhere. */
function nativeError(e: unknown): Error {
  const err = e as { code?: string; message?: string };
  const out = new Error(err?.message || "Passkey failed");
  out.name = err?.code === "cancelled" ? "NotAllowedError" : "PasskeyNativeError";
  return out;
}

export function passkeysSupported(): boolean {
  // The native path first: feature-detecting the web view would hide passkeys in the iPad app and on the Mac.
  if (nativePasskeysAvailable()) return true;
  try { return browserSupportsWebAuthn(); } catch { return false; }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function loginWithPasskey(): Promise<void> {
  const optRes = await fetch(`${API_BASE}/api/webauthn/login/options`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const options = await optRes.json();
  if (!optRes.ok) throw new Error(options?.error || "Could not start passkey sign-in");
  const assertion = nativePasskeysAvailable()
    ? await NativePasskey.authenticate({
        rpId: String(options?.rpId ?? "staff.boreal.financial"),
        challenge: String(options?.challenge ?? ""),
        allowCredentials: Array.isArray(options?.allowCredentials) ? options.allowCredentials.map((c: { id: string }) => ({ id: c.id })) : [],
      }).catch((e: unknown) => { throw nativeError(e); })
    : await startAuthentication({ optionsJSON: options });
  const verRes = await fetch(`${API_BASE}/api/webauthn/login/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assertion),
  });
  const data = await verRes.json();
  // BF_PORTAL_WEBAUTHN_DETAIL_v1 — surface the server's `detail` (the exact reason
  // verifyAuthenticationResponse threw) so the console shows the precise cause instead
  // of a bare "verification_failed".
  if (!verRes.ok) throw new Error(data?.detail ? `${data.error || "verification_failed"}: ${data.detail}` : (data?.error || "Passkey sign-in failed"));
  const token = data?.data?.token ?? data?.token ?? null;
  if (!token) throw new Error("No token returned from server");
  setAuthToken(token);
  captureRefreshToken(data);
}

export async function registerPasskey(): Promise<void> {
  const options = await api.post("/api/webauthn/register/options", {});
  const o = options as { challenge?: string; rp?: { id?: string }; user?: { id?: string; name?: string }; excludeCredentials?: Array<{ id: string }> };
  const attestation = nativePasskeysAvailable()
    ? await NativePasskey.register({
        rpId: String(o?.rp?.id ?? "staff.boreal.financial"),
        challenge: String(o?.challenge ?? ""),
        userId: String(o?.user?.id ?? ""),
        userName: String(o?.user?.name ?? "Boreal staff"),
        excludeCredentials: (o?.excludeCredentials ?? []).map((c) => ({ id: c.id })),
      }).catch((e: unknown) => { throw nativeError(e); })
    : await startRegistration({ optionsJSON: options as any });
  await api.post("/api/webauthn/register/verify", {
    ...attestation, deviceLabel: (navigator as any).platform || "Browser",
  });
}
