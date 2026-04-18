/**
 * Global formatting utilities — phone, currency, rates.
 * Import these wherever inputs or displays need formatting.
 */

/** Format as (###) ###-#### */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format as $1,000,000 (no decimals) */
export function formatDollar(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return "";
  return `$${Math.round(n).toLocaleString("en-CA")}`;
}

/** Strip formatting back to raw digits for API submission */
export function unformatPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function unformatDollar(formatted: string): number {
  return Number(formatted.replace(/[^0-9.]/g, "")) || 0;
}

/** Format interest rate as X.XX% */
export function formatRate(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return "";
  return `${n.toFixed(2)}%`;
}

/** Input handler: formats phone on change, returns raw digits */
export function phoneInputHandler(
  value: string,
  setter: (v: string) => void,
) {
  setter(formatPhone(value));
}
