export function normalizePhone(phone) {
    let p = phone.replace(/\D/g, '');
    if (p.length === 10)
        p = '1' + p;
    if (!p.startsWith('1'))
        throw new Error("Invalid phone");
    return `+${p}`;
}
export function safeNormalizeToE164(phone) {
    try {
        return normalizePhone(phone);
    }
    catch {
        return null;
    }
}
