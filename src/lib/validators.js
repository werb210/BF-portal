export function assertObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("INVALID_RESPONSE_SHAPE");
    }
}
