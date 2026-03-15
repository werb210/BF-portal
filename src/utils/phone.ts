export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  throw new Error("Invalid phone number format");
}

export function safeNormalizeToE164(phone: string): string {
  try {
    return normalizePhone(phone);
  } catch {
    return phone;
  }
}
