// BF_PHONE_FORMAT_v28 — Block 28
// Normalize an input string to a 10-digit North American number, then format
// as "(XXX) XXX-XXXX". Strips all non-digits. If user typed an 11-digit
// number starting with "1", drop the country code.
export function bfNormalizePhoneInput(raw: string): string {
  if (typeof raw !== "string") return "";
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";

  let ten = digits;
  if (ten.length === 11 && ten.startsWith("1")) {
    ten = ten.slice(1);
  } else if (ten.length > 10) {
    ten = ten.slice(-10);
  }

  if (ten.length <= 3) return `(${ten}`;
  if (ten.length <= 6) return `(${ten.slice(0, 3)}) ${ten.slice(3)}`;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6, 10)}`;
}
