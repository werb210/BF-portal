import { useEffect, useState } from "react";
import { isIOSSafari, isStandalonePWA } from "@/auth/msalLoginStrategy";

// BF_PORTAL_MACOS_SAFARI_INSTALL_v1 - Safari (iOS and macOS) never fires beforeinstallprompt,
// so the Chrome install banner never appears there. iOS Safari already had an "Add to Home Screen"
// hint; this adds the macOS Safari equivalent (Sonoma+ installs via File -> Add to Dock).
const STORAGE_KEY = "bf:iosInstallDismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type InstallMode = "ios" | "macos-safari";

function detectInstallMode(): InstallMode | null {
  if (isStandalonePWA()) return null;
  if (isIOSSafari()) return "ios";
  const ua = navigator.userAgent;
  const isMac = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) <= 1;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(ua);
  if (isMac && isSafari) return "macos-safari";
  return null;
}

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<InstallMode | null>(null);

  useEffect(() => {
    const detected = detectInstallMode();
    if (!detected) return;
    setMode(detected);

    try {
      const lastDismissedAt = localStorage.getItem(STORAGE_KEY);
      if (lastDismissedAt && Date.now() - Number(lastDismissedAt) < DISMISS_TTL_MS) return;
    } catch {
      // ignore storage failures and still show the banner
    }

    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible || !mode) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Boreal Financial as an app"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1000,
        background: "#0f172a",
        color: "#f1f5f9",
        padding: "14px 16px",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(15,23,42,0.35)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        fontSize: 14,
        lineHeight: 1.4,
        maxWidth: 520,
        marginLeft: "auto",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Install Boreal as an app</div>
        <div>
          {mode === "ios" ? (
            <>
              Tap the Share icon (<span aria-hidden="true" style={{ fontWeight: 700 }}>⬆</span>) at the bottom
              of Safari, then choose <b>Add to Home Screen</b>.
            </>
          ) : (
            <>
              In Safari&apos;s menu bar, choose <b>File</b> &rarr; <b>Add to Dock</b> to install this app
              (notifications and passkeys work best from the installed app).
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        style={{
          background: "transparent",
          color: "#cbd5e1",
          border: "1px solid #334155",
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 13,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Not now
      </button>
    </div>
  );
}

export default IOSInstallBanner;
