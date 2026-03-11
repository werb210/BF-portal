import { withApiBase } from "@/lib/apiBase";

export async function biFetch(path: string, options?: RequestInit) {
  const res = await fetch(withApiBase(`/api/bi${path}`), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(`BI API Error: ${res.status}`);
  }

  return res.json();
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
