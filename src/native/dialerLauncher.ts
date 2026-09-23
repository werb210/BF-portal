import { AppLauncher } from "@capacitor/app-launcher";
import { Capacitor } from "@capacitor/core";

export type NativeDialerTarget = { phone: string; contactId?: never } | { contactId: string; phone?: never };

export function borealDialerUrl(target: NativeDialerTarget): string {
  const params = new URLSearchParams();
  if (target.phone) params.set("phone", target.phone);
  if (target.contactId) params.set("contactId", target.contactId);
  return `borealdialer://call?${params.toString()}`;
}

/** Returns false so callers can retain the existing web/Twilio flow as fallback. */
export async function launchNativeBorealDialer(target: NativeDialerTarget): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const url = borealDialerUrl(target);
  try {
    const { value } = await AppLauncher.canOpenUrl({ url });
    if (!value) return false;
    await AppLauncher.openUrl({ url });
    return true;
  } catch {
    return false;
  }
}

// BF_PORTAL_DIALER_HANDOFF_v424
// Keep every "call this person" control on the recorded Boreal Dialer path when
// running natively, while preserving the browser/installation fallback.
export async function placeCall(phone: string, contactId?: string): Promise<"dialer" | "tel"> {
  const number = String(phone ?? "").trim();
  if (!number) return "tel";

  if (Capacitor.isNativePlatform()) {
    const opened = await launchNativeBorealDialer(
      contactId ? { contactId } : { phone: number },
    );
    if (opened) return "dialer";
  }

  window.location.href = `tel:${number}`;
  return "tel";
}
