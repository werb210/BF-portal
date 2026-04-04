export function normalizeArray(input) {
    if (Array.isArray(input))
        return input;
    if (input && typeof input === "object" && Array.isArray(input.items)) {
        return input.items;
    }
    if (input && typeof input === "object" && Array.isArray(input.data)) {
        return input.data;
    }
    if (input && typeof input === "object" && Array.isArray(input.results)) {
        return input.results;
    }
    return [];
}
