// BF_PORTAL_WEBAUTHN_v1 — passkey helpers.
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { setAuthToken } from "@/lib/authToken";
import { api } from "@/api";

export function passkeysSupported(): boolean {
  try { return browserSupportsWebAuthn(); } catch { return false; }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function loginWithPasskey(): Promise<void> {
  const optRes = await fetch(`${API_BASE}/api/webauthn/login/options`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const options = await optRes.json();
  if (!optRes.ok) throw new Error(options?.error || "Could not start passkey sign-in");
  const assertion = await startAuthentication({ optionsJSON: options });
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
}

export async function registerPasskey(): Promise<void> {
  const options = await api.post("/api/webauthn/register/options", {});
  const attestation = await startRegistration({ optionsJSON: options as any });
  await api.post("/api/webauthn/register/verify", {
    ...attestation, deviceLabel: (navigator as any).platform || "Browser",
  });
}
