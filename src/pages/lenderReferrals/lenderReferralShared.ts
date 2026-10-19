// BF_PORTAL_v827_REFERRAL_PIPELINE_CARD - shared bits for lender referrals (files lenders declined and sent us).
import { rawApiFetch } from "@/api";

export type StaffReferral = {
  id: string;
  lender_name: string | null;
  business_name: string;
  client_name: string | null;
  client_phone: string;
  requested_amount: string | number | null;
  decline_reason: string | null;
  zip_name: string;
  file_names?: string[] | null;
  status: "pending" | "accepting" | "accepted" | "declined";
  complete_package: boolean | null;
  decision_note: string | null;
  application_id: string | null;
  client_texted_at: string | null;
  created_at: string;
  import_error?: string | null;
  has_zip: boolean;
};

export function formatPhone(e164: string | null | undefined): string {
  const d = String(e164 ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(e164 ?? "");
}

export const money = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : "$" + Number(v).toLocaleString("en-CA", { maximumFractionDigits: 0 }));

export function decisionText(r: Pick<StaffReferral, "status" | "complete_package" | "client_texted_at">): string {
  if (r.status === "pending") return "Needs review - the client has not been contacted";
  if (r.status === "accepting") return "Accepting...";
  if (r.status === "declined") return "Declined - the client was not contacted";
  const share = r.complete_package ? "complete package, lender gets 50% of Boreal's fee" : "incomplete package, no lender share";
  return `Accepted (${share})${r.client_texted_at ? " - client texted" : " - client not texted yet"}`;
}

/** POST to a referral action; resolves to the JSON body, or throws with the server's message. */
export async function referralAction(id: string, path: "accept" | "decline" | "retry-import", body: Record<string, unknown> = {}): Promise<any> {
  const res = await rawApiFetch(`/api/lender-referrals/${encodeURIComponent(id)}/${path}`, { method: "POST", body: JSON.stringify(body) });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message ?? j?.error ?? "That did not work.");
  return j;
}

export async function downloadReferralZip(r: Pick<StaffReferral, "id" | "zip_name">): Promise<void> {
  const res = await rawApiFetch(`/api/lender-referrals/${encodeURIComponent(r.id)}/zip`);
  if (!res.ok) throw new Error("The zip could not be downloaded.");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = r.zip_name || "file.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
