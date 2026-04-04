export function normalizePhone(input) {
    const digits = input.replace(/[^\d]/g, "");
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
    }
    throw new Error("Invalid phone number");
}
