// BF_PORTAL_v_TEAMS_SHARE_SUPPORT - iPad/iPhone apps and Safari on iOS cannot share the screen from a web page.
export function screenShareSupported(): boolean {
  try {
    const md = (globalThis.navigator as Navigator | undefined)?.mediaDevices as (MediaDevices & { getDisplayMedia?: unknown }) | undefined;
    if (!md || typeof md.getDisplayMedia !== "function") return false;
    const ua = globalThis.navigator?.userAgent ?? "";
    const touchMac = /Macintosh/.test(ua) && (globalThis.navigator?.maxTouchPoints ?? 0) > 1;
    if (/iPad|iPhone|iPod/.test(ua) || touchMac) return false;
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return false;
    return true;
  } catch { return false; }
}
