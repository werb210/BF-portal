import api from "@/api";
export async function getUsers(params) {
    const res = await api.get("/users", { params });
    if (Array.isArray(res)) {
        return res;
    }
    return res?.users ?? [];
}
export async function updateUser(id, data) {
    const res = await api.patch(`/users/${id}`, data);
    if (!res)
        return null;
    return "user" in res ? res.user ?? null : res ?? null;
}
export async function getMe() {
    const res = await api.get("/users/me");
    if (!res)
        return null;
    return "user" in res ? res.user ?? null : res ?? null;
}
export async function updateMe(data) {
    const res = await api.patch("/users/me", data);
    if (!res)
        return null;
    return "user" in res ? res.user ?? null : res ?? null;
}
