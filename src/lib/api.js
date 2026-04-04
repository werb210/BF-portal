import { getApiBase } from "./apiBase";
import { assertSilo } from "./siloGuard";
export async function apiCall(path, options = {}) {
    const base = getApiBase();
    let res;
    try {
        res = await fetch(`${base}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "x-silo": window.__SILO__ || "BF",
                ...(options.headers || {})
            },
            credentials: "include"
        });
    }
    catch (err) {
        console.error("❌ NETWORK ERROR:", err);
        throw new Error("Network failure");
    }
    let json = {};
    try {
        json = await res.json();
    }
    catch {
        console.error("❌ INVALID JSON RESPONSE");
    }
    if (!res.ok) {
        console.error("❌ API ERROR:", json);
        throw new Error(json?.error || "API error");
    }
    if (json?.data) {
        assertSilo(json.data);
        return json.data;
    }
    return json;
}
