// BF_PORTAL_v817_IPAD_VOIP - incoming calls ring the iPad even when the portal app is closed.
// In the iPad app (native iOS with the BorealVoice plugin) incoming calls are registered natively
// (PushKit + CallKit, ios/App/App/PortalVoiceEngine.swift) with a token minted for app
// "portal-ios"; the Twilio JS Device is then used for OUTGOING calls only and never registered,
// so a call never rings twice. If the native side cannot register (no push credential on the
// server yet, no VoIP token), the JS Device registers for incoming exactly as before.
// Web browsers are unchanged.
import { dialerApi } from "./api";
import { useDialer } from "./store";
import { ringPush } from "./debugRing";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  BorealVoice,
  PORTAL_VOIP_APP,
  jsDeviceRegistersForIncoming,
  nativeVoiceAvailable,
  registerNativeIncoming,
  unregisterNativeIncoming,
} from "@/native/portalVoip";

export function tokenFrom(r: any): string | null {
  const t = r?.data?.token ?? r?.token;
  return typeof t === "string" && t ? t : null;
}

/** The voice token: on the iPad app the one carrying the portal's VoIP push credential. */
export async function fetchVoiceToken(native: boolean): Promise<string | null> {
  if (native) {
    try {
      const t = tokenFrom(await dialerApi.voiceTokenFor(PORTAL_VOIP_APP));
      if (t) return t;
    } catch (e: any) {
      ringPush("native.token.fail", e?.message);
    }
  }
  return tokenFrom(await dialerApi.voiceToken());
}

/** True when incoming calls are handled natively; false = the JS Device must register for them. */
export async function setupIncoming(native: boolean, token: string): Promise<boolean> {
  if (!native) return false;
  const ok = await registerNativeIncoming(token);
  ringPush("native.register", ok);
  useDialer.getState().setNativeVoice(ok);
  return !jsDeviceRegistersForIncoming({
    platform: Capacitor.getPlatform(),
    pluginAvailable: native,
    nativeRegistered: ok,
  });
}

// BF_PORTAL_v817_IPAD_VOIP - the voice token lives 4h (BF-Server BF_SERVER_VOICE_TOKEN_TTL_v1). The native
// registration only needs it to (re)register with Twilio, but a fresh one is handed over every 50 minutes and
// when the app comes back to the foreground (at most every 10 minutes), so a rotated VoIP token or a PushKit
// cold launch always finds a usable token in the Keychain. The JS Device (outgoing calls) gets the same token.
export const NATIVE_TOKEN_REFRESH_MS = 50 * 60 * 1000;
export const NATIVE_RESUME_MIN_GAP_MS = 10 * 60 * 1000;
let stopNativeRefresh: (() => void) | null = null;

type TokenTaker = { updateToken(token: string): unknown } | null | undefined;

export function startNativeTokenRefresh(getDevice: () => TokenTaker): () => void {
  stopNativeTokenRefresh();
  if (!nativeVoiceAvailable()) return () => {};
  let busy = false;
  let lastAt = Date.now();
  const run = async (why: string) => {
    if (busy) return;
    busy = true;
    lastAt = Date.now();
    try {
      const fresh = await fetchVoiceToken(true);
      if (!fresh) return;
      try { await getDevice()?.updateToken(fresh); } catch { /* outgoing Device refreshes itself on next call */ }
      const ok = await registerNativeIncoming(fresh);
      ringPush("native.token.refresh", { why, ok });
    } catch (e: any) {
      ringPush("native.token.refresh.fail", e?.message);
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => { void run("interval"); }, NATIVE_TOKEN_REFRESH_MS);
  let resume: Promise<{ remove: () => Promise<void> }> | null = null;
  try {
    resume = App.addListener("resume", () => {
      if (Date.now() - lastAt >= NATIVE_RESUME_MIN_GAP_MS) void run("resume");
    });
  } catch { /* no App plugin */ }
  const stop = () => {
    clearInterval(timer);
    if (resume) void Promise.resolve(resume).then((h) => h?.remove()).catch(() => {});
    if (stopNativeRefresh === stop) stopNativeRefresh = null;
  };
  stopNativeRefresh = stop;
  return stop;
}

export function stopNativeTokenRefresh(): void {
  stopNativeRefresh?.();
}

/** Token refresh: the native registration follows the JS Device's token. */
export async function refreshNativeToken(token: string): Promise<void> {
  if (!useDialer.getState().nativeVoice) return;
  await registerNativeIncoming(token);
}

/** Sign-out: stop this iPad ringing for the signed-out user. */
export async function teardownNativeIncoming(): Promise<void> {
  stopNativeTokenRefresh();
  // BF_PORTAL_v817_IPAD_VOIP - unregister even when the native registration had failed: the Keychain token goes too.
  if (!useDialer.getState().nativeVoice && !nativeVoiceAvailable()) return;
  await unregisterNativeIncoming();
  useDialer.getState().setNativeVoice(false);
  useDialer.getState().setNativeCall(null);
}

async function nameNativeCall(from: string | undefined): Promise<void> {
  const raw = String(from ?? "");
  if (!/\d{7,}/.test(raw)) return;
  try {
    const r: any = await dialerApi.resolveCaller(raw);
    const body = r?.data ?? r;
    const cur = useDialer.getState().nativeCall;
    if (body?.matched && body?.name && cur && cur.from === raw) useDialer.getState().setNativeCall({ ...cur, callerName: body.name });
  } catch { /* keep the number */ }
}

/** Mirrors native call events into the dialer store (the in-app "On a call with X" banner). */
export function bindNativeCallEvents(): () => void {
  if (!nativeVoiceAvailable()) return () => {};
  const st = () => useDialer.getState();
  const handles = [
    BorealVoice.addListener("callIncoming", (d: any) => {
      ringPush("native.callIncoming", d);
      st().setNativeCall({ ...d, phase: "ringing" });
      if (!d?.callerName) void nameNativeCall(d?.from);
    }),
    BorealVoice.addListener("callConnected", (d: any) => {
      ringPush("native.callConnected", d);
      st().setNativeCall({ ...(st().nativeCall ?? {}), ...d, phase: "connected" });
      if (st().nativeCall?.fromPanel) st().setStatus("connected"); // BF_PORTAL_v844_MAC_DIALER_PANEL - the panel shows the live call
    }),
    BorealVoice.addListener("callEnded", (d: any) => {
      ringPush("native.callEnded", d);
      const wasPanel = !!st().nativeCall?.fromPanel; // BF_PORTAL_v844_MAC_DIALER_PANEL
      st().setNativeCall(null);
      if (wasPanel) st().setStatus("ready");
    }),
    BorealVoice.addListener("callMuted", (d: any) => {
      const cur = st().nativeCall;
      if (cur) st().setNativeCall({ ...cur, muted: !!d?.muted });
    }),
    BorealVoice.addListener("registrationChanged", (d: any) => {
      // Registered late (the VoIP token arrived after the JS Device registered as a fallback):
      // hand incoming calls to the native side so the iPad does not ring twice.
      if (!d?.registered) return;
      st().setNativeVoice(true);
      const device: any = st().device;
      if (device?.state === "registered") void Promise.resolve(device.unregister?.()).catch(() => {});
    }),
  ];
  // A call answered from CallKit before the web app loaded (cold launch).
  void BorealVoice.getState().then((s) => {
    if (s?.call) st().setNativeCall({ ...s.call, muted: !!s.muted, speaker: !!s.speaker });
  }).catch(() => {});
  return () => {
    for (const h of handles) void Promise.resolve(h).then((x) => x?.remove()).catch(() => {});
  };
}

export async function nativeHangup(): Promise<void> {
  try { await BorealVoice.hangup(); } catch { /* the call screen still works */ }
}

export async function nativeToggleMute(): Promise<void> {
  const cur = useDialer.getState().nativeCall;
  if (!cur) return;
  const next = !cur.muted;
  try {
    const r = await BorealVoice.mute({ muted: next });
    const now = useDialer.getState().nativeCall;
    if (now) useDialer.getState().setNativeCall({ ...now, muted: r?.muted ?? next });
  } catch { /* unchanged */ }
}

export async function nativeToggleSpeaker(): Promise<void> {
  const cur = useDialer.getState().nativeCall;
  if (!cur) return;
  try {
    const r = await BorealVoice.speaker({ on: !cur.speaker });
    const now = useDialer.getState().nativeCall;
    if (now) useDialer.getState().setNativeCall({ ...now, speaker: !!r?.speaker });
  } catch { /* unchanged */ }
}

// BF_PORTAL_v824_NATIVE_OUTGOING
// The portal app on a Mac (the iPad app, "Designed for iPad") gets no microphone inside its web page, so the
// Twilio JS Device cannot place a call there ("Phone not ready: mediadevices_unavailable"). In that case the call
// is handed to the app's own Twilio engine (PortalVoiceEngine.startOutgoing) with the same parameters the JS
// Device would send, and shows in the "On a call with" banner (mute / speaker / hang up). The iPad, iPhone and
// web browsers keep calling from the web page exactly as before.
export function webMicAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

export function shouldCallNatively(opts: { native: boolean; webMic: boolean }): boolean {
  return opts.native && !opts.webMic;
}

export function callsNatively(): boolean {
  return shouldCallNatively({ native: nativeVoiceAvailable(), webMic: webMicAvailable() });
}

/** Only non-empty text values, as the native engine sends them to Twilio. */
export function nativeCallParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) out[key] = text;
  }
  return out;
}

/** Starts the call natively. Null when it started, otherwise the reason it could not. */
export async function startNativeOutgoing(params: Record<string, unknown>, who: { label: string; callerName?: string | null; fromPanel?: boolean }): Promise<string | null> {
  const clean = nativeCallParams(params);
  if (Object.keys(clean).length === 0) return "call_setup_failed";
  let token: string | null = null;
  try { token = await fetchVoiceToken(true); } catch { /* the engine falls back to its last token */ }
  try {
    const r = await BorealVoice.connect({ ...(token ? { accessToken: token } : {}), params: clean });
    if (!r?.started) {
      ringPush("native.outgoing.fail", r?.error);
      return r?.error || "call_setup_failed";
    }
  } catch (e: any) {
    ringPush("native.outgoing.fail", e?.message);
    return "call_setup_failed";
  }
  ringPush("native.outgoing.started", clean);
  const callerName = String(who.callerName ?? "").trim();
  useDialer.getState().setNativeCall({ from: who.label, ...(callerName ? { callerName } : {}), phase: "connecting", muted: false, speaker: false, ...(who.fromPanel ? { fromPanel: true } : {}) });
  return null;
}

export async function nativeSendDigits(digits: string): Promise<void> {
  if (!digits) return;
  try { await BorealVoice.sendDigits({ digits }); } catch { /* older build */ }
}
