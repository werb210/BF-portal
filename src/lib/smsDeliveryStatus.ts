// BF_PORTAL_BLOCK_v500_SMS_DELIVERY - Twilio's delivery result for one sent text,
// in plain English, reusing the error explanations from the Lenders tab (v465).
import { explainSmsError } from "@/pages/applications/tabs/signingDelivery";

export type DeliveryTag = { tone: "success" | "error" | "muted"; text: string };

export function smsDeliveryTag(status: string | null | undefined, errorCode: string | null | undefined): DeliveryTag | null {
  const s = String(status ?? "").toLowerCase();
  if (!s) return null;
  if (s === "delivered" || s === "read") return { tone: "success", text: "Delivered" };
  if (s === "failed" || s === "undelivered") return { tone: "error", text: `Not delivered - ${explainSmsError(errorCode)}` };
  return { tone: "muted", text: "Sent" };
}
