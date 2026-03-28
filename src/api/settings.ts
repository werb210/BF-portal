import apiClient from "./httpClient";
import type { AdminUser, BrandingSettingsState, ProfileSettings } from "@/state/settings.store";

export const fetchProfile = () => apiClient.get<ProfileSettings>("/users/me");
export const updateProfile = (payload: Partial<ProfileSettings>) =>
  apiClient.patch<ProfileSettings>("/users/me", payload);

export const fetchBranding = () => apiClient.get<BrandingSettingsState>("/settings/branding");
export const saveBranding = (payload: BrandingSettingsState) =>
  apiClient.post<BrandingSettingsState>("/settings/branding", payload);

export const fetchUsers = () => apiClient.get<AdminUser[]>("/users");
export const createUser = (payload: Pick<AdminUser, "email" | "role" | "firstName" | "lastName" | "phone">) =>
  apiClient.post<AdminUser>("/users", payload);
export const updateUserRole = (id: string, role: AdminUser["role"]) =>
  apiClient.post<AdminUser>(`/users/${id}/role`, { role });
export const disableUser = (id: string) => apiClient.post<AdminUser>(`/users/${id}/disable`);
export const enableUser = (id: string) => apiClient.post<AdminUser>(`/users/${id}/enable`);
