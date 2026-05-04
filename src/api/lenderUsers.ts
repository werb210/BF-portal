// BF_PORTAL_BLOCK_v88_BI_LENDER_USER_MGMT_v1
import api from "@/api";

export type LenderUser = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status?: string;
  disabled?: boolean;
  is_active?: boolean;
  active?: boolean;
  created_at?: string;
  last_login_at?: string | null;
};

export async function listLenderUsers(lenderId: string): Promise<LenderUser[]> {
  const res = await api.get<{ items: LenderUser[] }>(`/api/lenders/${lenderId}/users`);
  return res?.items ?? [];
}

export async function createLenderUser(
  lenderId: string,
  input: { email: string; phone: string; first_name?: string; last_name?: string }
): Promise<LenderUser> {
  return await api.post<LenderUser>(`/api/lenders/${lenderId}/users`, input);
}

export async function setLenderUserDisabled(userId: string, disabled: boolean): Promise<void> {
  const path = disabled ? `/api/users/${userId}/disable` : `/api/users/${userId}/enable`;
  await api.post(path);
}
