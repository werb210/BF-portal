export class ApiError extends Error {
    status;
    code;
    requestId;
    details;
    constructor({ status, message, code, requestId, details }) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.details = details;
    }
}
import { api as requestApi } from "@/api";
export { requestApi as default };
export { requestApi as api };
export async function request(config) {
    if ((config.method ?? "GET").toUpperCase() === "POST") {
        return requestApi.post(config.url ?? "/", config.data, { headers: config.headers });
    }
    return requestApi.get(config.url ?? "/", {
        headers: config.headers,
    });
}
