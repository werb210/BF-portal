// BF_PORTAL_BLOCK_v465_SIGNING_DELIVERY
// Twilio accepting the signing text is not the phone receiving it. BF-Server
// (v464) records Twilio's delivery result; this turns it into one plain line on
// the Lenders tab, so a blocked text (e.g. 30034, unregistered for US texting)
// is visible instead of looking like it went out.
import { formatPhone } from "./signingStatus";

export type SigningSmsResponse = {
  name?: string | null;
  sms?: { to?: string | null; status?: string | null; errorCode?: string | null; sentAt?: string | null } | null;
};
export type DeliveryLine = { tone: "success" | "error" | "muted"; text: string };

const ERROR_TEXT: Record<string, string> = {
  "30034": "US carriers blocked it because our number is not yet registered for US texting (A2P 10DLC)",
  "30003": "the phone was unreachable or switched off",
  "30004": "the recipient has blocked messages",
  "30005": "the number does not exist or is not a mobile",
  "30006": "the number is a landline or cannot receive texts",
  "30007": "the carrier filtered it as spam",
  "30008": "the carrier rejected it for an unknown reason",
  "21610": "the recipient has replied STOP to our texts",
  "21211": "the number is not valid",
  "21614": "the number is not a mobile number",
};

export function explainSmsError(code: string | null | undefined): string {
  const c = String(code ?? "").trim();
  if (!c) return "the carrier did not say why";
  return `${ERROR_TEXT[c] ?? "the carrier rejected it"} (error ${c})`;
}

function when(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : ` on ${t.toLocaleDateString()} at ${t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function describeSigningDelivery(r: SigningSmsResponse | null | undefined): DeliveryLine | null {
  const sms = r?.sms;
  if (!sms) return null;
  const who = r?.name?.trim() || "the applicant";
  const phone = formatPhone(sms.to) ?? "their mobile";
  const status = String(sms.status ?? "").toLowerCase();
  const at = when(sms.sentAt);
  if (status === "delivered") return { tone: "success", text: `Signing text delivered to ${who} at ${phone}${at}.` };
  if (status === "undelivered" || status === "failed") {
    return { tone: "error", text: `Signing text to ${who} at ${phone}${at} was not delivered: ${explainSmsError(sms.errorCode)}. Contact them another way and ask them to sign in at client.boreal.financial.` };
  }
  return { tone: "muted", text: `Signing text sent to ${who} at ${phone}${at}; waiting for the carrier to confirm delivery.` };
}
