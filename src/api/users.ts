import api from "./client";

export type User = {
  id: string;
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "Admin" | "Staff" | "Lender" | "Referrer";
  status: "active" | "disabled";
  silo: string;
  created_at: string;
  last_login_at: string | null;
};

export async function getUsers(params?: { role?: string; status?: string }) {
  const res = await api.get<{ users?: User[] } | User[]>("/users", { params });
  if (Array.isArray(res.data)) {
    return res.data;
  }
  return res.data?.users ?? [];
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "role" | "status">>
) {
  const res = await api.patch<{ user?: User } | User>(`/users/${id}`, data);
  return "user" in res.data ? res.data.user ?? null : res.data ?? null;
}

export async function getMe() {
  const res = await api.get<{ user?: User } | User>("/users/me");
  return "user" in res.data ? res.data.user ?? null : res.data ?? null;
}

export async function updateMe(data: {
  email?: string;
  first_name?: string;
  last_name?: string;
}) {
  const res = await api.patch<{ user?: User } | User>("/users/me", data);
  return "user" in res.data ? res.data.user ?? null : res.data ?? null;
}
