import { http } from "@/api";
import { getApiBase } from "@/lib/apiBase";
const resolveBaseURL = () => getApiBase();
export function createApi(silo, _token) {
    return {
        defaults: {
            baseURL: resolveBaseURL(),
        },
        get: (path) => http.get(path),
        post: (path, body) => http.post(path, body),
        patch: (path, body) => http.patch(path, body),
        put: (path, body) => http.put(path, body),
        delete: (path) => http.delete(path),
    };
}
