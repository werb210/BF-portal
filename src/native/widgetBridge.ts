// BF_PORTAL_WIDGET_BRIDGE_v28
// The portal is a Capacitor webview: the session token lives in localStorage,
// inside the WebView's sandbox. A home-screen widget is a SEPARATE PROCESS and
// cannot read it - which is the whole reason a widget cannot simply be added to
// this app and expected to work.
//
// @capacitor/preferences is already a dependency and writes to UserDefaults.
// Pointed at an App Group suite, that store is shared between the app and the
// widget extension. So every place the web app sets or clears the token, it
// also mirrors it there.
//
// Deliberately best-effort throughout. Signing in must never fail because a
// widget could not be told about it: on the web, on Android, or before the
// native side exists, every call here is a no-op.
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// Must match the App Group on both the app and the widget target. A mismatch
// silently yields an empty store rather than an error, so it is defined once.
export const WIDGET_GROUP = "group.com.boreal.portal";
export const WIDGET_TOKEN_KEY = "widget_auth_token";
export const WIDGET_SILO_KEY = "widget_active_silo";

function isNativeIOS(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export async function mirrorTokenToWidget(token: string | null): Promise<void> {
  if (!isNativeIOS()) return;
  try {
    await Preferences.configure({ group: WIDGET_GROUP });
    if (token) await Preferences.set({ key: WIDGET_TOKEN_KEY, value: token });
    else await Preferences.remove({ key: WIDGET_TOKEN_KEY });
  } catch {
    // A widget that cannot refresh shows its last values and an "as of" time.
    // That is a far better outcome than blocking a sign-in.
  }
}

// A tile has no silo switcher, so it needs to know which business the person
// was last looking at to be right by default.
export async function mirrorSiloToWidget(silo: string | null): Promise<void> {
  if (!isNativeIOS()) return;
  try {
    await Preferences.configure({ group: WIDGET_GROUP });
    if (silo) await Preferences.set({ key: WIDGET_SILO_KEY, value: silo });
    else await Preferences.remove({ key: WIDGET_SILO_KEY });
  } catch {
    // As above.
  }
}
