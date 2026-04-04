import { rawApiFetch } from "@/api";
import { ApiResponseSchema } from "@boreal/shared-contract";
const normalizeBody = (body) => {
    if (body == null)
        return undefined;
    if (typeof body === "string" || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob || body instanceof ArrayBuffer) {
        return body;
    }
    return JSON.stringify(body);
};
export async function api(url, options = {}) {
    const res = await rawApiFetch(url, {
        headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
        ...options,
        body: normalizeBody(options.body),
    });
    const json = await res.json();
    const parsed = ApiResponseSchema.safeParse(json);
    if (!parsed.success) {
        throw new Error("API contract violation");
    }
    if (parsed.data.status === "error") {
        throw new Error(parsed.data.error || "API error");
    }
    return parsed.data.data;
}
export async function apiBlob(url) {
    const res = await rawApiFetch(url);
    if (!res.ok)
        throw new Error("Download failed");
    return res.blob();
}
