export type PushPermissionPreference = {
  status: NotificationPermission;
  prompted: boolean;
  updatedAt: number;
};

const buildKey = (userId?: string | null) => `staff-portal:push-permission:${userId ?? "anonymous"}`;

const defaultPreference = (): PushPermissionPreference => ({
  status: "default",
  prompted: false,
  updatedAt: Date.now()
});

export const readPushPreference = (userId?: string | null): PushPermissionPreference => {
  if (typeof window === "undefined") return defaultPreference();
  const key = buildKey(userId);
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return defaultPreference();
  try {
    const parsed = JSON.parse(raw) as PushPermissionPreference;
    if (!parsed || typeof parsed.status !== "string") return defaultPreference();
    return {
      status: parsed.status,
      prompted: Boolean(parsed.prompted),
      updatedAt: Number(parsed.updatedAt) || Date.now()
    };
  } catch {
    return defaultPreference();
  }
};

export const writePushPreference = (userId: string | null | undefined, preference: PushPermissionPreference) => {
  if (typeof window === "undefined") return;
  const key = buildKey(userId);
  window.sessionStorage.setItem(key, JSON.stringify(preference));
};
