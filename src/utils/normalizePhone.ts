// BF_PORTAL_PHONE_LEADING_ONE_v20
// Ten digits beginning with "1" is not a North American number - no NANP area
// code starts with 0 or 1. It is what you get when someone types the country
// code and drops a digit, and the old length-only check then prepended a SECOND
// +1. "+1 423-205-619" became "+11423205619", went to Twilio, and came back as
// a server error the user could not interpret.
export class PhoneFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneFormatError";
  }
}

/** True when a digit string is a plausible NANP national number (NPA + NXX + 4). */
export function isPlausibleNanpNational(digits: string): boolean {
  if (digits.length !== 10) return false;
  const npa = digits.slice(0, 3);
  const nxx = digits.slice(3, 6);
  if (!/^[2-9]/.test(npa) || !/^[2-9]/.test(nxx)) return false;
  if (npa.endsWith("11") || nxx.endsWith("11")) return false;
  return true;
}

export function normalizePhone(input: string): string {
  const digits = String(input ?? "").replace(/[^\d]/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    if (!isPlausibleNanpNational(digits.slice(1))) {
      throw new PhoneFormatError("That doesn't look like a valid phone number. Please check it.");
    }
    return `+${digits}`;
  }

  if (digits.length === 10) {
    if (digits.startsWith("1")) {
      throw new PhoneFormatError(
        "That looks like it's missing a digit. Enter all 10 digits after the country code.",
      );
    }
    if (!isPlausibleNanpNational(digits)) {
      throw new PhoneFormatError("That doesn't look like a valid phone number. Please check it.");
    }
    return `+1${digits}`;
  }

  if (digits.length > 0 && digits.length < 10) {
    throw new PhoneFormatError("That number is too short. Enter all 10 digits.");
  }

  throw new PhoneFormatError("Invalid phone number");
}
