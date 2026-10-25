// BF_PORTAL_v852_CALC_QBO - BF-Server /api/quickbooks: the company connection (Admin) and each file's fee invoice.
import { api } from "@/api";

export type QboStatus = {
  ok: boolean;
  configured: boolean;
  missing: string[];
  environment: "sandbox" | "production";
  connected: boolean;
  reason?: string;
  connection?: { realmId: string; companyName: string | null; connectedAt: string | null; connectedByName: string | null; refreshExpiresAt: string | null; environment: string } | null;
  taxCode?: string | null;
  invoices?: { open: number; paid: number; failed: number };
};

export type QboInvoice = {
  qboInvoiceId: string | null;
  docNumber: string | null;
  amount: number | null;
  status: "pending" | "open" | "paid";
  syncState: "queued" | "ok" | "failed" | string;
  lastError: string | null;
  attempts: number;
  syncedAt: string | null;
  url: string | null;
};

const app = (id: string) => "/api/quickbooks/applications/" + encodeURIComponent(id);

export const quickbooksApi = {
  status: () => api.get<QboStatus>("/api/quickbooks/status"),
  connect: () => api.post<{ ok: boolean; url: string }>("/api/quickbooks/connect", {}),
  disconnect: () => api.post<{ ok: boolean; revoked: boolean }>("/api/quickbooks/disconnect", {}),
  saveTaxCode: (taxCode: string | null) => api.put<{ ok: boolean; taxCode: string | null }>("/api/quickbooks/settings", { taxCode }),
  invoice: (applicationId: string) => api.get<{ ok: boolean; configured: boolean; invoice: QboInvoice | null }>(app(applicationId) + "/invoice"),
  retry: (applicationId: string) => api.post<{ ok: boolean; action: string; error: string | null; invoice: QboInvoice | null }>(app(applicationId) + "/retry", {}),
};

export function invoiceMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "";
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
