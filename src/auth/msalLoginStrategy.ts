// Block 19: shared platform detection + login-strategy picker.
//
// iOS Safari (iPhone, iPad) reliably blocks the OAuth popup or breaks the
// postMessage handshake with login.microsoftonline.com. Use redirect flow on
// those clients only — popup remains the default everywhere else.
//
// iPadOS 13+ reports as macOS in navigator.userAgent. Disambiguate using
// maxTouchPoints, which is the documented Apple guidance.

export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";

  const isIPhoneOrIPod = /iPad|iPhone|iPod/.test(ua);
  const isIPadOSAsMac =
    typeof (navigator as any).maxTouchPoints === "number" &&
    (navigator as any).maxTouchPoints > 1 &&
    /Macintosh/.test(ua);

  if (!isIPhoneOrIPod && !isIPadOSAsMac) return false;

  // Real Safari has "Safari/" in UA and lacks the in-app browsers' tokens.
  // Chrome on iOS = CriOS, Firefox = FxiOS, Edge = EdgiOS, Opera = OPiOS.
  const isSafariEngine =
    /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isSafariEngine;
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari sets navigator.standalone when launched from home-screen icon.
  // Other browsers expose display-mode: standalone via media query.
  const navStandalone = (navigator as any).standalone === true;
  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return navStandalone || mediaStandalone;
}

export type LoginStrategy = "popup" | "redirect";

// BF_MSAL_DIAG_v24
export function bfLogMsalPhase(phase: string, extra?: Record<string, unknown>): void {
  try {
    console.log("[msal.diag]", phase, {
      ts: new Date().toISOString(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      standalone: typeof navigator !== "undefined" ? (navigator as any).standalone === true : false,
      ...(extra ?? {}),
    });
  } catch {
    // no-op
  }
}

export function pickLoginStrategy(): LoginStrategy {
  const strategy = isIOSSafari() ? "redirect" : "popup";
  bfLogMsalPhase("pickLoginStrategy", { strategy, isIOSSafari: isIOSSafari(), isStandalone: isStandalonePWA() });
  return strategy;
}
