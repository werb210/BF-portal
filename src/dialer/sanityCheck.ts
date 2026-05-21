// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import type { Device } from "@twilio/voice-sdk";
import { ringPush } from "./debugRing";
export type PreflightResult = | { ok: true } | { ok: false; reason: string; detail?: unknown };
export async function preflight(device: Device | null): Promise<PreflightResult> {
  if (!device) return { ok: false, reason: "device_not_initialized" };
  const state = (device as any).state; ringPush("preflight.device.state", state);
  if (state !== "registered") return { ok: false, reason: "device_not_registered", detail: { state } };
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return { ok: false, reason: "mediadevices_unavailable" };
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); ringPush("preflight.mic.ok"); return { ok: true }; }
  catch (e: any) { ringPush("preflight.mic.denied", e?.message); return { ok: false, reason: "mic_permission_denied", detail: e?.message }; }
}
export async function probeMicPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> { try { const p = await (navigator as any).permissions?.query?.({ name: "microphone" as PermissionName }); return (p?.state as any) || "unknown"; } catch { return "unknown"; } }
export async function listAudioDevices(): Promise<{ inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] }> { try { const all = await navigator.mediaDevices.enumerateDevices(); return { inputs: all.filter((d) => d.kind === "audioinput"), outputs: all.filter((d) => d.kind === "audiooutput") }; } catch { return { inputs: [], outputs: [] }; } }
