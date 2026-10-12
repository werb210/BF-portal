// BF_PORTAL_v789_SHARED_SHELL - BF-Server calls that BI screens make on purpose. Staff, mailboxes,
// task queues, telephony and the BF lender list are shared across silos and live only on BF-Server
// (/api/...), while everything BI-owned lives on BI-Server (/api/v1/bi/...). Keeping the shared calls
// here, outside src/silos/bi, lets scripts/check-bi-silo-isolation.sh hold every BI silo file to the
// BI-Server prefix.
import { api } from "@/api";

export type StaffUser = { id: string; first_name?: string; last_name?: string; email?: string };

/** Staff users (owners, assignees). */
export async function listStaffUsers(): Promise<StaffUser[]> {
  const r = await api.get<{ users?: StaffUser[] } | StaffUser[]>("/api/users");
  return Array.isArray(r) ? r : (r?.users ?? []);
}

/** The signed-in user's own and shared Office 365 mailboxes. */
export function getSharedMailboxes() {
  return api.get<{ mine?: { address?: string } | null; shared?: Array<{ address?: string }> }>("/api/crm/shared-mailboxes");
}

/** Task queues a sequence step can assign to. */
export function getTaskQueues<T>() {
  return api.get<{ data?: { queues?: T[] }; queues?: T[] }>("/api/tasks/queues");
}

/** Copy BI companies into BF's lender list. */
export function importBiCompaniesToBfLenders(companyIds: string[]) {
  return api<Record<string, unknown>>("/api/portal/lenders/import-from-bi", { method: "POST", body: { companyIds } });
}

/** Calls and texts BF-Server's telephony logged against a phone number (the dialer is shared). */
export function getCommsTimelineByPhone<T>(phone: string) {
  return api<T>(`/api/communications/timeline?phone=${encodeURIComponent(phone)}`);
}
