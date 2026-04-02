import api from "@/api";
import type { AdminUser, BrandingSettingsState, ProfileSettings } from "@/state/settings.store";

export const fetchProfile = () => api.get<ProfileSettings>("/users/me");
export const updateProfile = (payload: Partial<ProfileSettings>) =>
  api.patch<ProfileSettings>("/users/me", payload);

export const fetchBranding = () => api.get<BrandingSettingsState>("/settings/branding");
export const saveBranding = (payload: BrandingSettingsState) =>
  api.post<BrandingSettingsState>("/settings/branding", payload);

export const fetchUsers = () => api.get<AdminUser[]>("/users");
export const createUser = (payload: Pick<AdminUser, "email" | "role" | "firstName" | "lastName" | "phone">) =>
  api.post<AdminUser>("/users", payload);
export const updateUserRole = (id: string, role: AdminUser["role"]) =>
  api.post<AdminUser>(`/users/${id}/role`, { role });
export const disableUser = (id: string) => api.post<AdminUser>(`/users/${id}/disable`);
export const enableUser = (id: string) => api.post<AdminUser>(`/users/${id}/enable`);
