// BF_PORTAL_v875_SSO (ported from KS-Portal auth/SsoButtons.tsx, Microsoft only) - "Sign in with Microsoft" on the staff
// sign-in page, shown only when an Admin has switched it on. Also finishes the sign-in when the server sends the browser
// back here with a one-time code. Not shown in the iPad app: Microsoft's pages would open outside the app.
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SSO_OFF, exchangeSsoCode, fetchSsoConfig, readSsoReturn, ssoErrorText, ssoStartUrl, type SsoConfig } from "@/auth/sso";

type Props = {
  /** Test seams. */
  loadConfig?: () => Promise<SsoConfig>;
  exchange?: (code: string) => Promise<void>;
  onSignedIn?: () => void;
  native?: boolean;
};

function isNativeApp(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function SsoButtons({ loadConfig = fetchSsoConfig, exchange = exchangeSsoCode, onSignedIn, native }: Props) {
  const isNative = native ?? isNativeApp();
  const [config, setConfig] = useState<SsoConfig>(SSO_OFF);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const exchanged = useRef(false);

  useEffect(() => {
    if (isNative) return;
    let live = true;
    const back = readSsoReturn(window.location);
    if (back.error) setError(ssoErrorText(back.error));
    if (back.code && !exchanged.current) {
      exchanged.current = true;
      // The code is single-use: take it out of the address bar before anything else.
      window.history.replaceState(null, "", window.location.pathname);
      setFinishing(true);
      exchange(back.code)
        .then(() => {
          if (onSignedIn) onSignedIn();
          else window.location.href = "/dashboard";
        })
        .catch((e: unknown) => {
          if (!live) return;
          setFinishing(false);
          setError(e instanceof Error && e.message ? e.message : "Microsoft sign-in didn't work. Please try again.");
        });
    }
    void loadConfig().then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, [isNative, loadConfig, exchange, onSignedIn]);

  if (isNative) return null;
  if (!config.microsoft && !error && !finishing) return null;

  return (
    <div className="w-full max-w-md flex flex-col gap-3" data-testid="sso-buttons">
      {finishing ? <p role="status" className="text-sm text-white text-center">Finishing sign-in…</p> : null}
      {error ? <p role="alert" className="text-sm text-red-900 bg-red-100 border border-red-300 rounded-lg px-3 py-2">{error}</p> : null}
      {config.microsoft ? (
        <>
          <div className="flex items-center gap-3 text-xs text-white/80" aria-hidden="true">
            <span className="flex-1 h-px bg-white/30" />
            <span>or</span>
            <span className="flex-1 h-px bg-white/30" />
          </div>
          <a
            href={ssoStartUrl()}
            data-testid="sso-microsoft"
            className="w-full flex items-center justify-center gap-3 py-3 px-5 text-[15px] font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg no-underline"
          >
            <MicrosoftMark />
            <span>Sign in with Microsoft</span>
          </a>
        </>
      ) : null}
    </div>
  );
}
