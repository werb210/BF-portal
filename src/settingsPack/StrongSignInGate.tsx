// BF_PORTAL_v869_SETTINGS_PACK_SECURITY - when Boreal requires a passkey or two-step sign-in and this session only
// used a text code, the server answers 403 STRONG_SIGN_IN_REQUIRED. The api client raises an event; this screen offers
// the second step: sign in with a passkey, or add one now (text code + passkey), then reloads.
import { useEffect, useState } from "react";
import { loginWithPasskey, passkeysSupported, registerPasskey } from "@/auth/passkey";
import { api } from "@/api";
import { Notice, button, card, errText, h3, muted, quiet } from "./ui";
import { STRONG_EVENT } from "./strongSignIn";

export default function StrongSignInGate() {
  const [show, setShow] = useState(false);
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const on = () => {
      setShow(true);
      void api.get<{ has_passkey: boolean }>("/api/security/status").then((r) => setHasPasskey(r.has_passkey)).catch(() => setHasPasskey(null));
    };
    window.addEventListener(STRONG_EVENT, on);
    return () => window.removeEventListener(STRONG_EVENT, on);
  }, []);
  if (!show) return null;
  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    try { await fn(); window.location.reload(); } catch (e) { setErr(errText(e, "That did not work. Try again.")); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ssi-h" data-testid="strong-sign-in"
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ ...card, maxWidth: 440, width: "100%" }}>
        <h3 id="ssi-h" style={h3}>One more step to sign in</h3>
        <p style={{ ...muted, fontSize: 14 }}>Your company requires a passkey or two-step sign-in. A text code alone isn't enough.</p>
        {!passkeysSupported() && <Notice error="This browser can't use passkeys. Sign in from a browser or device that supports them, or ask an Admin." />}
        {passkeysSupported() && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hasPasskey !== false && <button type="button" style={button} onClick={() => void run(loginWithPasskey)}>Sign in with my passkey</button>}
          <button type="button" style={hasPasskey === false ? button : quiet} onClick={() => void run(registerPasskey)}>Set up a passkey on this device</button>
        </div>}
        <Notice error={err} />
      </div>
    </div>
  );
}
