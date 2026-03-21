import { buildUrl } from "@/lib/api";
export interface PreApplicationRecord {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  annualRevenue: string | number | null;
  requestedAmount: string | number | null;
}

export async function fetchPreApplications(): Promise<PreApplicationRecord[]> {
  const res = await fetch(buildUrl("/api/preapp/admin/list"), {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load pre-applications");
  }

  return res.json();
}

export async function convertPreApplication(id: string) {
  const res = await fetch(buildUrl("/api/preapp/admin/convert"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    throw new Error("Conversion failed");
  }

  return res.json();
}
