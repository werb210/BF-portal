// BF_PORTAL_SIN_MASK_v381 - a SIN / SSN is shown as its last four digits only,
// everywhere the portal displays applicant data, including raw JSON views.

const FULL_NAMES = new Set(["socialinsurancenumber", "socialsecuritynumber"]);

/** True for keys that hold a SIN / SSN: ssn, sin, sin_ssn, partnerSin, guarantorSSN, sinNumber... */
export function isSinKey(key: string): boolean {
  if (!key) return false;
  if (FULL_NAMES.has(key.replace(/[_\-\s]/g, "").toLowerCase())) return true;
  // snake / kebab / bare: "ssn", "sin", "partner_sin", "sin_ssn", "ssn_number"
  if (/(^|[_\-\s])(sin|ssn)([_\-]?number)?$/i.test(key)) return true;
  // camelCase: "partnerSin", "guarantorSSN", "sinOrSsn", "applicantSinNumber"
  if (/[a-z0-9](Sin|SIN|Ssn|SSN)(Number)?$/.test(key)) return true;
  return false;
}

/** "123456789" -> "•••-••-6789". Empty -> fallback. Fewer than 4 digits -> all dots. */
export function maskSin(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 0) return fallback;
  if (digits.length < 4) return "•".repeat(9);
  return `•••-••-${digits.slice(-4)}`;
}

/** Deep copy with every SIN / SSN value masked. Safe to pass to JSON.stringify for display. */
export function redactSensitive<T>(input: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (isSinKey(k) && (typeof val === "string" || typeof val === "number")) {
          out[k] = maskSin(val, "");
        } else {
          out[k] = walk(val);
        }
      }
      return out;
    }
    return v;
  };
  return walk(input) as T;
}
