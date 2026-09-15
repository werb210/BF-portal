// BF_PORTAL_FACE_ID_v243
import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { getAuthToken } from "@/lib/authToken";
import { clearAuth } from "@/lib/authStorage";
import { BiometricUnlock, biometryLabel, isNativeIos, shouldLock, type BiometryStatus } from "./biometricLockPolicy"; // BF_PORTAL_BIOMETRIC_CASE_v249

export default function BiometricLock() {
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<BiometryStatus["biometryType"]>("faceID");
  const available = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await BiometricUnlock.authenticate({ reason: "Unlock Boreal Portal" });
      if (r?.ok) setLocked(false);
      else setError("Not recognised. Try again.");
    } catch {
      setError("Not recognised. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const evaluate = useCallback((coldStart: boolean) => {
    const lock = shouldLock({
      native: isNativeIos(),
      hasSession: Boolean(getAuthToken()),
      biometryAvailable: available.current,
      backgroundedAt: backgroundedAt.current,
      now: Date.now(),
      coldStart,
    });
    backgroundedAt.current = null;
    if (lock) {
      setLocked(true);
      void unlock();
    }
  }, [unlock]);

  useEffect(() => {
    if (!isNativeIos()) return;
    let cancelled = false;
    let handle: { remove: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const s = await BiometricUnlock.status();
        if (cancelled) return;
        available.current = Boolean(s?.available);
        setType(s?.biometryType ?? "faceID");
      } catch {
        available.current = false;
      }
      evaluate(true);
      handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) backgroundedAt.current = Date.now();
        else evaluate(false);
      });
    })();
    return () => { cancelled = true; void handle?.remove(); };
  }, [evaluate]);

  if (!locked) return null;
  const label = biometryLabel(type);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portal locked"
      data-testid="biometric-lock"
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "#0B1F3A", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}
    >
      <div style={{ fontSize: 20, fontWeight: 600 }}>Boreal Portal is locked</div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void unlock()}
        style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#BF9B49", color: "#0B1F3A", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "Checking..." : `Unlock with ${label}`}
      </button>
      {error ? <div role="status" style={{ fontSize: 14, color: "#fecaca" }}>{error}</div> : null}
      <button
        type="button"
        onClick={() => { clearAuth(); window.location.assign("/login"); }}
        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", textDecoration: "underline", fontSize: 14, cursor: "pointer" }}
      >
        Sign in with a code instead
      </button>
    </div>
  );
}
