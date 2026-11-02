// BF_PORTAL_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - moving a file to Funded. The server refuses (409) while a funding condition is
// open; an Admin may then give an override reason, which the server writes to the audit log.
import { api } from "@/api";

export type OutstandingCondition = { id: string; title: string; owner: string; status: string; due_date: string | null };
export type FundingConflict = { message: string; outstanding: OutstandingCondition[]; can_override: boolean };

export const OWNER_LABEL: Record<string, string> = { staff: "Staff", client: "Client", lender: "Lender" };
export const STATUS_LABEL: Record<string, string> = { open: "Open", received: "Received", cleared: "Cleared", waived: "Waived" };

/** The 409 from PATCH /api/portal/applications/:id/status when conditions are open, else null. */
export function fundingConflict(err: unknown): FundingConflict | null {
  const e = err as { status?: number; details?: any } | null;
  const d = e?.details;
  if (!e || e.status !== 409 || !d || d.error !== "funding_conditions_outstanding") return null;
  return {
    message: String(d.message ?? "Funding conditions are still open."),
    outstanding: Array.isArray(d.outstanding) ? d.outstanding : [],
    can_override: d.can_override === true,
  };
}

export function conflictList(c: FundingConflict): string {
  return c.outstanding.map((x) => `- ${x.title} (${OWNER_LABEL[x.owner] ?? x.owner}, ${STATUS_LABEL[x.status] ?? x.status})`).join("\n");
}

/**
 * PATCH the stage. For Funded with open conditions: staff are told what is left; an Admin is asked for an override
 * reason and the move is retried with it. Returns false when the move did not happen (blocked or cancelled).
 */
export async function patchStatusWithFundingGate(applicationId: string, body: Record<string, unknown>,
  ui: { alert: (m: string) => void; prompt: (m: string, d?: string) => string | null } = window): Promise<boolean> {
  const url = `/api/portal/applications/${applicationId}/status`;
  try {
    await api.patch(url, body);
    return true;
  } catch (err) {
    const c = fundingConflict(err);
    if (!c) throw err;
    const list = conflictList(c);
    if (!c.can_override) {
      ui.alert(`This file cannot move to Funded yet. ${c.message}\n\n${list}\n\nClear or waive them on the application's Funding tab, or ask an Admin to override.`);
      return false;
    }
    const reason = ui.prompt(`${c.message}\n\n${list}\n\nAs an Admin you can fund it anyway. The reason is kept in the audit log.\n\nOverride reason (required):`, "");
    if (reason === null) return false;
    if (reason.trim().length < 3) {
      ui.alert("An override reason is required.");
      return false;
    }
    await api.patch(url, { ...body, override_reason: reason.trim() });
    return true;
  }
}
