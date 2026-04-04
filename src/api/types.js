export function isApiError(res) {
    return typeof res === "object" && res !== null && res.status === "error";
}
