import { create } from "zustand";
import apiClient from "@/api/httpClient";
import type { UserRole } from "@/utils/roles";

export type ProfileSettings = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  lastLogin?: string;
  microsoftConnected?: boolean;
  microsoftAccountEmail?: string;
};

export type BrandingSettingsState = {
  logoUrl: string;
  logoWidth: number;
};

export type AdminUser = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: UserRole;
  disabled?: boolean;
};

export type SettingsState = {
  profile: ProfileSettings;
  branding: BrandingSettingsState;
  users: AdminUser[];
  isLoadingProfile: boolean;
  isLoadingBranding: boolean;
  isLoadingUsers: boolean;
  statusMessage?: string;
  fetchProfile: () => Promise<void>;
  saveProfile: (updates: Partial<ProfileSettings>) => Promise<void>;
  fetchBranding: () => Promise<void>;
  saveBranding: (branding: BrandingSettingsState) => Promise<void>;
  fetchUsers: () => Promise<void>;
  addUser: (user: Pick<AdminUser, "email" | "role" | "firstName" | "lastName" | "phone">) => Promise<void>;
  updateUser: (id: string, updates: Partial<AdminUser>) => Promise<void>;
  updateUserRole: (id: string, role: UserRole) => Promise<void>;
  setUserDisabled: (id: string, disabled: boolean) => Promise<void>;
  setMicrosoftConnection: (payload: { email?: string; connected: boolean }) => void;
  setStatusMessage: (message?: string) => void;
  reset: () => void;
};

type SettingsSnapshot = Omit<
  SettingsState,
  | "fetchProfile"
  | "saveProfile"
  | "fetchBranding"
  | "saveBranding"
  | "fetchUsers"
  | "addUser"
  | "updateUser"
  | "updateUserRole"
  | "setUserDisabled"
  | "setMicrosoftConnection"
  | "setStatusMessage"
  | "reset"
>;

const createInitialState = (): SettingsSnapshot => ({
  profile: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profileImage: undefined,
    lastLogin: undefined,
    microsoftConnected: false,
    microsoftAccountEmail: undefined
  },
  branding: {
    logoUrl: "",
    logoWidth: 220
  },
  users: [],
  isLoadingProfile: false,
  isLoadingBranding: false,
  isLoadingUsers: false,
  statusMessage: undefined
});

type ProfileResponse = Partial<ProfileSettings>;
type BrandingResponse = Partial<BrandingSettingsState>;
type UsersResponse = AdminUser[];

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...createInitialState(),
  fetchProfile: async () => {
    set({ isLoadingProfile: true });
    try {
      const data = await apiClient.get<ProfileResponse>("/users/me");
      if (data) {
        set((state) => ({
          profile: (() => {
            const nameValue = (data as { name?: string }).name?.trim() ?? "";
            const nextProfile = { ...state.profile, ...data };
            if (nameValue && (!nextProfile.firstName || !nextProfile.lastName)) {
              const [firstName, ...rest] = nameValue.split(" ");
              nextProfile.firstName = nextProfile.firstName || firstName || "";
              nextProfile.lastName = nextProfile.lastName || rest.join(" ");
            }
            return nextProfile;
          })(),
          statusMessage: undefined
        }));
      }
    } finally {
      set({ isLoadingProfile: false });
    }
  },
  saveProfile: async (updates) => {
    set({ isLoadingProfile: true });
    try {
      const data = await apiClient.patch<ProfileResponse>("/users/me", updates);
      const nextProfile = data ? { ...get().profile, ...data } : { ...get().profile, ...updates };
      set({
        profile: nextProfile,
        statusMessage: "Profile updated"
      });
    } finally {
      set({ isLoadingProfile: false });
    }
  },
  fetchBranding: async () => {
    set({ isLoadingBranding: true });
    try {
      const data = await apiClient.get<BrandingResponse>("/settings/branding");
      if (data) {
        set((state) => ({
          branding: { ...state.branding, ...data },
          statusMessage: undefined
        }));
      }
    } finally {
      set({ isLoadingBranding: false });
    }
  },
  saveBranding: async (branding) => {
    set({ isLoadingBranding: true });
    try {
      const data = await apiClient.post<BrandingResponse>("/settings/branding", branding);
      const nextBranding = data ? { ...branding, ...data } : branding;
      set({
        branding: nextBranding,
        statusMessage: "Branding updated"
      });
    } finally {
      set({ isLoadingBranding: false });
    }
  },
  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const data = await apiClient.get<UsersResponse | { users?: UsersResponse }>("/users");
      const nextUsers = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];
      const safeUsers = nextUsers.map((user) => ({
        ...user,
        id: typeof user.id === "string" ? user.id : ""
      }));
      set({ users: safeUsers, statusMessage: undefined });
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  addUser: async (user) => {
    set({ isLoadingUsers: true });
    try {
      const data = await apiClient.post<AdminUser>("/users", user);
      const created = data ?? {
        id: `u-${Date.now()}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      };
      set((state) => ({
        users: [...state.users, created],
        statusMessage: "User added"
      }));
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  updateUser: async (id, updates) => {
    set({ isLoadingUsers: true });
    try {
      const data = await apiClient.patch<AdminUser>(`/users/${id}`, updates);
      set((state) => ({
        users: state.users.map((user) => (user.id === id ? { ...user, ...updates, ...data } : user)),
        statusMessage: "User updated"
      }));
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  updateUserRole: async (id, role) => {
    set({ isLoadingUsers: true });
    try {
      const data = await apiClient.post<AdminUser>(`/users/${id}/role`, { role });
      set((state) => ({
        users: state.users.map((user) => (user.id === id ? { ...user, ...data, role } : user)),
        statusMessage: "Role updated"
      }));
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  setUserDisabled: async (id, disabled) => {
    set({ isLoadingUsers: true });
    try {
      const endpoint = disabled ? `/users/${id}/disable` : `/users/${id}/enable`;
      const data = await apiClient.post<AdminUser>(endpoint);
      set((state) => ({
        users: state.users.map((user) => (user.id === id ? { ...user, ...data, disabled } : user)),
        statusMessage: disabled ? "User disabled" : "User enabled"
      }));
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  setMicrosoftConnection: (payload) =>
    set((state) => ({
      profile: {
        ...state.profile,
        microsoftConnected: payload.connected,
        microsoftAccountEmail: payload.email ?? state.profile.microsoftAccountEmail
      }
    })),
  setStatusMessage: (message) => set({ statusMessage: message }),
  reset: () => set({ ...createInitialState() })
}));

export const getInitialSettingsState = createInitialState;
