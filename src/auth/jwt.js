export function decodeJwt(token) {
    if (!token)
        return null;
    try {
        const [, payload] = token.split(".");
        if (!payload)
            return null;
        return JSON.parse(atob(payload));
    }
    catch {
        return null;
    }
}
