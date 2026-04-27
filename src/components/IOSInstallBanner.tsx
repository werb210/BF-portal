import { useEffect, useState } from "react";
import { isIOSSafari, isStandalonePWA } from "@/auth/msalLoginStrategy";

const STORAGE_KEY = "bf:iosInstallDismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari() || isStandalonePWA()) return;

    try {
      const lastDismissedAt = localStorage.getItem(STORAGE_KEY);
      if (lastDismissedAt && Date.now() - Number(lastDismissedAt) < DISMISS_TTL_MS) return;
    } catch {
      // ignore storage failures and still show the banner
    }

    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

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
        color: "#f8fafc",
        padding: "14px 16px",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(15,23,42,0.35)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        fontSize: 14,
        lineHeight: 1.4
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Install Boreal as an app</div>
        <div>
          Tap the Share icon (<span aria-hidden="true" style={{ fontWeight: 700 }}>⬆</span>) at the bottom
          of Safari, then choose <b>Add to Home Screen</b>.
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
          flexShrink: 0
        }}
      >
        Not now
      </button>
    </div>
  );
}

export default IOSInstallBanner;
