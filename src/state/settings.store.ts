import { create } from "zustand";
import api from "@/api";
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
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  silo?: string;
  disabled?: boolean;
};

export function normalizeAdminUser(raw: any): AdminUser {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    firstName: raw.firstName ?? raw.first_name ?? undefined,
    lastName: raw.lastName ?? raw.last_name ?? undefined,
  };
}

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

function normalizeProfileResponse(data: ProfileResponse): Partial<ProfileSettings> {
  const mapped = data as ProfileResponse & {
    first_name?: string | null;
    last_name?: string | null;
    profile_image?: string | null;
    last_login?: string | null;
  };

  return {
    ...data,
    firstName: data.firstName ?? mapped.first_name ?? undefined,
    lastName: data.lastName ?? mapped.last_name ?? undefined,
    profileImage: data.profileImage ?? mapped.profile_image ?? undefined,
    lastLogin: data.lastLogin ?? mapped.last_login ?? undefined
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...createInitialState(),
  fetchProfile: async () => {
    set({ isLoadingProfile: true });
    try {
      const data = await api.get<ProfileResponse>("/api/users/me");
      if (data) {
        const profileData = ((data as { data?: ProfileResponse })?.data ?? data) as ProfileResponse;
        const normalized = normalizeProfileResponse(profileData);
        set((state) => ({
          profile: (() => {
            const nameValue = (profileData as { name?: string }).name?.trim() ?? "";
            const nextProfile = { ...state.profile, ...normalized };
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
      const data = await api.patch<ProfileResponse>("/api/users/me", updates);
      const normalized = data ? normalizeProfileResponse(data) : updates;
      const nextProfile = { ...get().profile, ...normalized };
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
      const data = await api.get<BrandingResponse>("/settings/branding");
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
      const data = await api.post<BrandingResponse>("/settings/branding", branding);
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
      const data = await api.get<UsersResponse | { users?: UsersResponse }>("/api/users");
      const nextUsers = Array.isArray(data)
        ? data
        : Array.isArray((data as { users?: UsersResponse })?.users)
          ? (data as { users?: UsersResponse }).users ?? []
          : Array.isArray((data as { data?: UsersResponse })?.data)
            ? (data as { data?: UsersResponse }).data ?? []
          : [];
      const safeUsers = nextUsers.map(normalizeAdminUser).map((user) => ({
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
      const data = await api.post<AdminUser>("/api/users", user);
      const created = normalizeAdminUser(data ?? {
        id: `u-${Date.now()}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
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
      const data = await api.patch<AdminUser>(`/api/users/${id}`, updates);
      set((state) => ({
        users: state.users.map((user) =>
          user.id === id
            ? normalizeAdminUser({ ...user, ...updates, ...data })
            : user
        ),
        statusMessage: "User updated"
      }));
    } finally {
      set({ isLoadingUsers: false });
    }
  },
  updateUserRole: async (id, role) => {
    set({ isLoadingUsers: true });
    try {
      const data = await api.post<AdminUser>(`/api/users/${id}/role`, { role });
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
      const endpoint = disabled ? `/api/users/${id}/disable` : `/api/users/${id}/enable`;
      const data = await api.post<AdminUser>(endpoint);
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
