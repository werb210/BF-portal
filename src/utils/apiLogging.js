import { getRequestId } from "@/utils/requestId";
import { setLastApiRequest } from "@/state/apiClientTrace";
import { endPendingRequest, startPendingRequest } from "@/utils/requestTracking";
import { logger as appLogger } from "@/utils/logger";
const SENSITIVE_KEYS = ["authorization", "password", "token", "refresh", "access", "secret", "apikey", "api_key"];
const isSensitiveKey = (key) => SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive));
const redactSensitive = (value) => {
    if (Array.isArray(value))
        return value.map((entry) => redactSensitive(entry));
    if (value && typeof value === "object") {
        const result = {};
        Object.entries(value).forEach(([key, val]) => {
            result[key] = isSensitiveKey(key) ? "[REDACTED]" : redactSensitive(val);
        });
        return result;
    }
    return value;
};
const serialize = (value) => {
    if (value === undefined)
        return "undefined";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
};
const truncate = (value, max = 1024) => (value.length > max ? `${value.slice(0, max)}…` : value);
const headersToRecord = (headers) => {
    const entries = [];
    headers.forEach((value, key) => entries.push([key, value]));
    return Object.fromEntries(entries);
};
export const buildRequestUrl = (config) => {
    const base = config.baseURL ?? "";
    const url = config.url ?? "";
    if (!base)
        return url;
    if (!url)
        return base;
    if (base.endsWith("/") && url.startsWith("/"))
        return `${base}${url.slice(1)}`;
    if (!base.endsWith("/") && !url.startsWith("/"))
        return `${base}/${url}`;
    return `${base}${url}`;
};
export const attachRequestIdAndLog = (config) => {
    const requestId = getRequestId();
    const headers = new Headers(config.headers ?? {});
    if (!config.skipRequestId)
        headers.set("X-Request-Id", requestId);
    config.headers = headersToRecord(headers);
    const pendingId = startPendingRequest(config);
    config.__pendingId = pendingId;
    console.info("API request", {
        requestId,
        method: config.method?.toUpperCase(),
        url: buildRequestUrl(config),
        headers: redactSensitive(headersToRecord(headers)),
        payload: config.data ? redactSensitive(config.data) : undefined
    });
    return config;
};
export const logResponse = (response) => {
    const requestId = getRequestId();
    endPendingRequest(response.config.__pendingId);
    console.info("API response", { requestId, status: response.status, data: truncate(serialize(response)) });
    setLastApiRequest({
        path: buildRequestUrl(response.config),
        method: response.config.method?.toUpperCase(),
        status: response.status,
        requestId,
        timestamp: Date.now()
    });
    return response;
};
export const logError = (error) => {
    const requestId = getRequestId();
    const config = error.config ?? {};
    endPendingRequest(config.__pendingId);
    const isCanceled = error.code === "ERR_CANCELED";
    const isTransientBodyRead = error.message.includes("Body is unusable: Body has already been read");
    const logMethod = isCanceled || isTransientBodyRead ? appLogger.warn : appLogger.error;
    logMethod("API error", {
        requestId,
        method: config.method?.toUpperCase(),
        url: buildRequestUrl(config),
        status: error.response?.status,
        code: error.code,
        message: error.message
    });
    setLastApiRequest({
        path: buildRequestUrl(config),
        method: config.method?.toUpperCase(),
        status: error.response?.status,
        requestId,
        timestamp: Date.now()
    });
    return error;
};
