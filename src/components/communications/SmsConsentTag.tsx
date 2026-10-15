import { useContext, useEffect, useState } from "react";
import { api } from "@/api";
import SiloContext from "@/context/SiloContext";

// BF_PORTAL_v809_SMS_UPDATES_CONSENT - a client who did not tick "Text me updates about my application" gets no
// automatic texts. Staff can still text them by hand; this tag says so before they do (BF-Server v809).
export default function SmsConsentTag({ phone }: { phone: string | null | undefined }) {
  const [noConsentFor, setNoConsentFor] = useState<string | null>(null);
  // The "Text me updates" box is on the Boreal Financial client app, so the tag is shown in the BF silo only.
  const silo = String(useContext(SiloContext)?.silo ?? "BF").toUpperCase();
  const digits = String(phone ?? "").replace(/\D/g, "");
  useEffect(() => {
    setNoConsentFor(null);
    if (silo !== "BF" || digits.length < 10) return;
    let live = true;
    Promise.resolve(api<{ smsUpdatesConsent?: boolean }>("/api/communications/sms/consent", { params: { phone: digits } }))
      .then((r) => { if (live) setNoConsentFor(r?.smsUpdatesConsent === false ? digits : null); })
      .catch(() => { if (live) setNoConsentFor(null); });
    return () => { live = false; };
  }, [digits, silo]);
  // Never show a previous client's result while the selected number or silo changes.
  if (silo !== "BF" || digits.length < 10 || noConsentFor !== digits) return null;
  return (
    <span
      data-testid="sms-no-consent-tag"
      title={"This client didn't tick \"Text me updates about my application\", so they get no automatic texts. You can still text them yourself."}
      style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}
    >
      No text consent
    </span>
  );
}
