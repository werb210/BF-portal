import { apiFetch } from "@/lib/api";

export async function biFetch(path: string, options?: RequestInit) {
  const res = await apiFetch(`/api/bi${path}`, options);
  if (res == null) {
    throw new Error("BI API Error");
  }
  return res;
}

export async function biGetContacts() {
  return biFetch("/crm/contacts");
}

export async function biGetReferrers() {
  return biFetch("/crm/referrers");
}

export async function biGetLenders() {
  return biFetch("/crm/lenders");
}

export async function biGetCommissions() {
  return biFetch("/commissions");
}

export async function biGetReportSummary() {
  return biFetch("/reports/summary");
}
