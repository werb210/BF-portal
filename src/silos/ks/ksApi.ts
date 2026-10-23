// BF_PORTAL_v849_KS_SILO - client for KS-Ops, the Keystone operations service.
//
// The Keystone (KS) silo talks ONLY to KS-Ops, never to BF-Server, so it cannot use `api` from "@/api" (that client
// always targets BF-Server / BI-Server / SLF-server, attaches the BF token and sends X-Silo). This is the one place
// the KS silo calls fetch().
//
// Sign-in (KS-Ops src/auth/staff.ts): POST {KS_OPS}/api/ops/auth/exchange { bfToken } swaps the portal's BF-Server
// token for a 1-hour KS-Ops staff token. Only BF Admin users get one, and when OPS_ADMIN_EMAILS is set on KS-Ops only
// those emails. The token is kept in memory and in sessionStorage (this tab only) and swapped again on a 401.
import { getAuthToken } from "@/lib/authToken";

export const KS_OPS_DEFAULT_URL = "https://ks-ops-dev.azurewebsites.net";
const TOKEN_KEY = "ks-ops.staff-token";
// Swap the token a minute before KS-Ops would refuse it.
const EXPIRY_MARGIN_MS = 60_000;

export function ksOpsBaseUrl(): string {
  const env = import.meta.env.VITE_KS_OPS_URL;
  const raw = (env && env.trim()) || KS_OPS_DEFAULT_URL;
  return raw.replace(/\/+$/, "");
}

export type KsStaffUser = { id: string; email: string | null; name: string | null; role: string };

type StoredToken = { token: string; expiresAt: number; user: KsStaffUser | null };

export class KsOpsError extends Error {
  status: number;
  code: string;
  fieldErrors: Record<string, string>;
  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "KsOpsError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Errors that mean "this person may not use Keystone operations" (not a passing fault). */
export const KS_ACCESS_DENIED_CODES = ["admin_only", "not_allowed", "email_required"];

export function isKsAccessDenied(err: unknown): boolean {
  return err instanceof KsOpsError && err.status === 403 && KS_ACCESS_DENIED_CODES.includes(err.code);
}

let memoryToken: StoredToken | null = null;
let exchangeInFlight: Promise<StoredToken> | null = null;

function readStored(): StoredToken | null {
  if (memoryToken) return memoryToken;
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (parsed && typeof parsed.token === "string" && typeof parsed.expiresAt === "number") {
      memoryToken = parsed;
      return parsed;
    }
  } catch {
    // unreadable storage: sign in again
  }
  return null;
}

function store(t: StoredToken | null) {
  memoryToken = t;
  try {
    if (t) window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: the in-memory copy still works for this page
  }
}

export function clearKsToken() {
  store(null);
  exchangeInFlight = null;
}

export function currentKsUser(): KsStaffUser | null {
  return readStored()?.user ?? null;
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorFrom(status: number, body: any): KsOpsError {
  const fieldErrors: Record<string, string> =
    body && typeof body.errors === "object" && body.errors ? (body.errors as Record<string, string>) : {};
  const code = typeof body?.error === "string" ? body.error : status === 401 ? "unauthorized" : "request_failed";
  const firstField = Object.values(fieldErrors)[0];
  const message =
    (typeof body?.message === "string" && body.message) ||
    (typeof firstField === "string" && firstField) ||
    (status === 401 ? "Your Keystone session has expired. Please try again." : "Keystone operations could not complete that request.");
  return new KsOpsError(status, code, message, fieldErrors);
}

async function exchange(): Promise<StoredToken> {
  const bfToken = getAuthToken();
  if (!bfToken) throw new KsOpsError(401, "bf_token_required", "Sign in to the staff portal first.");
  let res: Response;
  try {
    res = await fetch(`${ksOpsBaseUrl()}/api/ops/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ bfToken }),
    });
  } catch {
    throw new KsOpsError(0, "unreachable", `Could not reach Keystone operations (${ksOpsBaseUrl()}).`);
  }
  const body = await readJson(res);
  if (!res.ok || !body || typeof body.token !== "string") throw errorFrom(res.status || 500, body);
  const ttl = Number(body.expires_in) > 0 ? Number(body.expires_in) : 3600;
  const t: StoredToken = { token: body.token, expiresAt: Date.now() + ttl * 1000, user: (body.user as KsStaffUser) ?? null };
  store(t);
  return t;
}

/** A KS-Ops staff token, swapping the BF token for one when none is held or it is about to expire. */
export async function ensureKsToken(force = false): Promise<StoredToken> {
  const held = force ? null : readStored();
  if (held && held.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return held;
  if (!exchangeInFlight) {
    exchangeInFlight = exchange().finally(() => {
      exchangeInFlight = null;
    });
  }
  return exchangeInFlight;
}

export type KsRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  params?: Record<string, string | number | null | undefined>;
};

function urlFor(path: string, params?: KsRequestOptions["params"]): string {
  const url = new URL(`${ksOpsBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

/** One call to the KS-Ops staff API. A 401 swaps the token once and retries. Never sends X-Silo. */
export async function ksRequest<T = any>(path: string, opts: KsRequestOptions = {}): Promise<T> {
  const send = async (token: string) => {
    const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    try {
      return await fetch(urlFor(path, opts.params), {
        method: opts.method ?? "GET",
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      throw new KsOpsError(0, "unreachable", `Could not reach Keystone operations (${ksOpsBaseUrl()}).`);
    }
  };
  let res = await send((await ensureKsToken()).token);
  if (res.status === 401) {
    clearKsToken();
    res = await send((await ensureKsToken(true)).token);
  }
  const body = await readJson(res);
  if (!res.ok) {
    if (res.status === 401) clearKsToken();
    throw errorFrom(res.status, body);
  }
  return body as T;
}

// ---- Types (KS-Ops responses) ----

export const KS_LICENSEE_STATUSES = [
  "pending_payment", "provisioning", "trial", "active", "past_due", "suspended", "cancelled",
] as const;
export const KS_PLANS = ["starter", "growth", "pro"] as const;
export const KS_BILLING_INTERVALS = ["annual", "monthly"] as const;
export const KS_SUPPORT_LEVELS = ["email", "priority", "premium", "dedicated"] as const;
export const KS_TICKET_STATUSES = ["open", "waiting", "resolved", "closed"] as const;
export const KS_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const KS_REQUEST_STATUSES = ["open", "done", "declined"] as const;

export type KsDashboard = {
  licensees: number;
  by_status: Record<string, number>;
  seats: number;
  mrr: number;
  trials_active: number;
  past_due: number;
  overdue_invoices: number;
  overdue_amount: number;
  open_tickets: number;
  open_requests: number;
  data_purges: Array<{ id: string; company_name: string; company_code: string; cancelled_at: string; data_purge_on: string; due: boolean }>;
  data_purges_due: number;
  currency: string;
};

export type KsWatchlistStats = { opted_in_licensees: number; files: number; entries: number };

export type KsLicenseeSummary = {
  id: string;
  company_name: string;
  company_code: string;
  plan: string;
  billing_interval: string;
  support_level: string;
  seats: number;
  extra_storage_blocks: number;
  status: string;
  mrr: number;
  plan_sync_status: string;
  server_url: string | null;
  data_purge_on: string | null;
  created_at: string;
  last_report: { period: string; seats: number; minutes: number; texts: number } | null;
};

export type KsLicensee = KsLicenseeSummary & {
  legal_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  country: string;
  province_state: string | null;
  mailing_address: string | null;
  website: string | null;
  addons?: Record<string, boolean> | null;
  client_url: string | null;
  portal_url: string | null;
  has_ops_key: boolean;
  ops_key_rotated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_fee_paid: boolean;
  plan_sync_error: string | null;
  plan_synced_at: string | null;
  pgi_link_status?: string | null;
  pgi_link_error?: string | null;
  watchlist_opt_in?: boolean;
  cancelled_at?: string | null;
  purged_at?: string | null;
  source?: string;
};

export type KsUsageRow = {
  period: string;
  seats: number;
  minutes: number;
  texts: number;
  assistant_chats?: number;
  storage_bytes?: number | string;
  overage_minutes?: number;
  overage_texts?: number;
  final?: boolean;
  received_at?: string;
};

export type KsInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  due_date: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
};

export type KsTicket = {
  id: string;
  licensee_id: string | null;
  subject: string;
  status: string;
  priority: string;
  source: string;
  requester_name: string | null;
  requester_email: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  company_code?: string | null;
  message_count?: number;
  last_message_at?: string | null;
};

export type KsTicketMessage = {
  id: string;
  author_type: "licensee" | "staff";
  author_name: string | null;
  author_email: string | null;
  body: string;
  internal: boolean;
  created_at: string;
};

export type KsRequest = {
  id: string;
  licensee_id: string;
  kind: string;
  current_plan: string | null;
  requested_plan: string | null;
  requested_extra_storage_blocks: number | null;
  requested_by: string | null;
  message: string | null;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  company_name?: string;
  company_code?: string;
};

export type KsNote = { id: string; author: string; body: string; created_at: string };
export type KsAudit = { id: string | number; actor: string; action: string; details: unknown; created_at: string };
export type KsPlanChange = { id: string; created_at: string; [k: string]: unknown };

export type KsLicenseeDetail = {
  licensee: KsLicensee;
  pricing: { billable_seats: number; seat_price: number; seats: number; support: number; storage: number; mrr: number; onboarding_fee: number };
  usage: KsUsageRow[];
  invoices: KsInvoice[];
  tickets: KsTicket[];
  notes: KsNote[];
  plan_changes: KsPlanChange[];
  requests: KsRequest[];
  audit: KsAudit[];
};

export type KsInvoicePreview = {
  period: string;
  currency: string;
  lines: Array<{ description: string; quantity: number; unit_amount: number; amount: number }>;
  recurring: number;
  overage: number;
  total: number;
};

// ---- Endpoints ----

const enc = encodeURIComponent;

export const ksApi = {
  me: () => ksRequest<{ user: KsStaffUser }>("/api/ops/auth/me"),
  dashboard: () => ksRequest<KsDashboard>("/api/ops/dashboard"),
  watchlist: () => ksRequest<KsWatchlistStats>("/api/ops/watchlist"),
  pgiBackfill: () => ksRequest<{ ok: boolean; queued: number }>("/api/ops/pgi/backfill", { method: "POST", body: {} }),

  licensees: (filter: { status?: string; q?: string } = {}) =>
    ksRequest<{ licensees: KsLicenseeSummary[] }>("/api/ops/licensees", { params: { status: filter.status, q: filter.q } }),
  createLicensee: (body: Record<string, unknown>) =>
    ksRequest<{ licensee: KsLicensee; ops_key: string | null; message: string }>("/api/ops/licensees", { method: "POST", body }),
  licensee: (id: string) => ksRequest<KsLicenseeDetail>(`/api/ops/licensees/${enc(id)}`),
  updateLicensee: (id: string, body: Record<string, unknown>) =>
    ksRequest<{ licensee: KsLicensee; plan_push: { ok: boolean; error?: string } | null; billing_sync: string | null }>(
      `/api/ops/licensees/${enc(id)}`,
      { method: "PATCH", body },
    ),
  addNote: (id: string, body: string) => ksRequest<{ note: KsNote }>(`/api/ops/licensees/${enc(id)}/notes`, { method: "POST", body: { body } }),
  rotateOpsKey: (id: string) =>
    ksRequest<{ licensee_id: string; ops_key: string; message: string }>(`/api/ops/licensees/${enc(id)}/ops-key`, { method: "POST", body: {} }),
  syncUsage: (id: string, period?: string) =>
    ksRequest<{ ok: boolean; stored: boolean }>(`/api/ops/licensees/${enc(id)}/sync-usage`, { method: "POST", body: {}, params: { period } }),
  invoicePreview: (id: string, period?: string) =>
    ksRequest<KsInvoicePreview>(`/api/ops/licensees/${enc(id)}/invoices/preview`, { method: "POST", body: {}, params: { period } }),
  billingCheckout: (id: string) =>
    ksRequest<{ url: string; session_id: string }>(`/api/ops/licensees/${enc(id)}/billing/checkout`, { method: "POST", body: {} }),
  pgiLink: (id: string) => ksRequest<{ ok: boolean; action: string }>(`/api/ops/licensees/${enc(id)}/pgi-link`, { method: "POST", body: {} }),
  markPurged: (id: string) => ksRequest<{ result: string }>(`/api/ops/licensees/${enc(id)}/purged`, { method: "POST", body: {} }),

  tickets: (filter: { status?: string; licensee_id?: string } = {}) =>
    ksRequest<{ tickets: KsTicket[] }>("/api/ops/tickets", { params: { status: filter.status, licensee_id: filter.licensee_id } }),
  ticket: (id: string) => ksRequest<{ ticket: KsTicket; messages: KsTicketMessage[] }>(`/api/ops/tickets/${enc(id)}`),
  createTicket: (body: Record<string, unknown>) => ksRequest<{ ticket: KsTicket }>("/api/ops/tickets", { method: "POST", body }),
  updateTicket: (id: string, body: Record<string, unknown>) =>
    ksRequest<{ ticket: KsTicket }>(`/api/ops/tickets/${enc(id)}`, { method: "PATCH", body }),
  replyTicket: (id: string, body: { body: string; internal: boolean; status?: string }) =>
    ksRequest<{ message: KsTicketMessage; emailed: boolean }>(`/api/ops/tickets/${enc(id)}/messages`, { method: "POST", body }),

  requests: (status?: string) => ksRequest<{ requests: KsRequest[] }>("/api/ops/requests", { params: { status } }),
  updateRequest: (id: string, status: string) =>
    ksRequest<{ request: KsRequest }>(`/api/ops/requests/${enc(id)}`, { method: "PATCH", body: { status } }),
};
