// BF_PORTAL_v884_LABELS - one small helper that turns stored codes (tags, product codes, lead sources, document
// categories, statuses) into plain words for staff: application_started -> "Application started", TERM_LOAN -> "Term loan",
// canceled -> "Cancelled". It reuses the lender product labels and only adds the few words a plain split gets wrong.
import { LENDER_PRODUCT_CATEGORY_LABELS } from "@/types/lenderManagement.types";

const OVERRIDES: Record<string, string> = {
  // product codes (long and short forms the server and the client app use)
  ...Object.fromEntries(Object.entries(LENDER_PRODUCT_CATEGORY_LABELS).map(([k, v]) => [k.toLowerCase(), v.replace(/ \(Not live\)$/, "")])),
  term: "Term loan",
  loc: "Line of credit",
  equipment: "Equipment finance",
  sba: "SBA / Government",
  mca: "Merchant cash advance",
  abl: "Asset based lending",
  po: "Purchase order finance",
  working_capital: "Working capital",
  // statuses
  canceled: "Cancelled",
  cancelled: "Cancelled",
  pending_payment: "Waiting for payment",
  past_due: "Past due",
  // lead sources
  client_direct: "Client (direct)",
  website: "Website",
  contact_form: "Contact form",
  // document categories
  personal_net_worth: "Personal net worth statement",
  ar_aging: "A/R aging",
  ap_aging: "A/P aging",
  pnl: "Profit and loss",
};

// Words that keep their capitals once split out of a code.
const UPPER = new Set(["ar", "ap", "sba", "pgi", "id", "ip", "api", "sms", "pdf", "csv", "url", "crm", "gst", "hst", "pst", "qst", "nda", "loc", "abl", "mca", "po", "ein", "bn", "cra", "kyc", "aml", "otp", "ai", "ok", "us", "ca", "bf", "bi", "slf"]);

/** True for a code that is only meaningful to the system (for example Keystone's "exp--..." experiment codes). */
export function isInternalCode(value: unknown): boolean {
  const s = String(value ?? "").trim();
  return /^exp--/i.test(s) || /^__/.test(s);
}

/** Plain words for a stored code. Text that is already words (has a space and no underscores) is returned as it is. */
export function humanizeCode(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (OVERRIDES[key]) return OVERRIDES[key]!;
  if (/\s/.test(raw) && !/[_]/.test(raw)) return raw;
  if (/^[a-z]+$/.test(raw)) return raw.charAt(0).toUpperCase() + raw.slice(1);
  if (!/[_-]/.test(raw) && !/^[A-Z0-9]+$/.test(raw) && !/[a-z][A-Z]/.test(raw)) return raw;
  const words = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\-\s.]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (!words.length) return raw;
  return words
    .map((w, i) => (UPPER.has(w) ? w.toUpperCase() : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Money with separators: 2200000 -> "$2,200,000", 230436.87 -> "$230,436.87". Non-numbers come back unchanged. */
export function formatMoneyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && !/^\s*-?\$?\s*[\d,]+(\.\d+)?\s*$/.test(value)) return value;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return String(value);
  const cents = Math.round(n * 100) % 100 !== 0;
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** An IP address without the port the server sometimes keeps on it: "203.0.113.5:51234" -> "203.0.113.5", "[2001:db8::1]:443" -> "2001:db8::1". */
export function stripIpPort(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracket) return bracket[1]!;
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(s);
  if (v4) return v4[1]!;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i.exec(s);
  if (mapped) return mapped[1]!;
  return s;
}

/** A date and time for lists, without seconds: "Nov 2, 2026, 3:11 PM". Empty or bad values give "". */
export function formatDateTimeShort(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Thousands separators for an amount being typed: "2200000" -> "2,200,000", "1234.5" -> "1,234.5". Keeps a trailing ".". */
export function groupDigits(raw: string): string {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  if (!s) return "";
  const [int, ...rest] = s.split(".");
  const grouped = (int ?? "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length ? `${grouped || "0"}.${rest.join("")}` : grouped;
}

/** The plain number behind a typed amount: "2,200,000" -> "2200000". */
export function ungroupDigits(typed: string): string {
  return String(typed ?? "").replace(/[^\d.]/g, "");
}

/**
 * The words for the business's time zone. The server keeps Alberta as "America/Regina" (UTC-6 all year, so the clock maths
 * work in older browsers) and labels it "Alberta time"; staff should read "Alberta time (America/Edmonton)".
 */
export function zoneWords(timeZone?: string | null, label?: string | null): string {
  const tz = String(timeZone ?? "").trim();
  const l = String(label ?? "").trim();
  if (/^America\/(Regina|Edmonton)$/i.test(tz) || /alberta|utc-?6|regina|edmonton/i.test(l)) return "Alberta time (America/Edmonton)";
  if (l && tz) return `${l} (${tz})`;
  return l || tz;
}

/** Words for the codes inside a sentence: "Status changed from pending_payment to canceled" -> "... from waiting for payment to cancelled". */
export function humanizeCodesInText(text: string | null | undefined): string {
  return String(text ?? "")
    .replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (code) => humanizeCode(code).toLowerCase())
    .replace(/\bcanceled\b/g, "cancelled");
}
