// BF_PORTAL_v909_AVATARS - one avatar everywhere a person's initials used to show: the top-right user menu, the Team
// list, Team chat and the dialler. The photo comes from My Profile (saved as soon as it is chosen); initials when there
// is none or the image fails to load.
import { useEffect, useState } from "react";
import { api } from "@/api";

export const AVATAR_EVENT = "bf-avatar-updated";

export function initialsOf(name: string | null | undefined): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p.charAt(0)).join("") || "?").toUpperCase();
}

const COLORS = ["#1e3a8a", "#6d28d9", "#047857", "#b45309", "#b91c1c", "#0e7490"];

export function UserAvatar({ name, url, size = 32, testId }: { name: string | null | undefined; url?: string | null; size?: number; testId?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const label = String(name ?? "").trim() || "User";
  if (url && !broken) {
    return <img data-testid={testId} src={url} alt={label} title={label} onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  const color = COLORS[label.charCodeAt(0) % COLORS.length];
  return (
    <span data-testid={testId} aria-label={label} title={label} style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#ffffff", display: "inline-grid", placeItems: "center", fontWeight: 700, fontSize: Math.max(10, Math.round(size * 0.38)), flexShrink: 0 }}>
      {initialsOf(label)}
    </span>
  );
}

// The signed-in person's photo, shared by every screen: loaded once, refreshed when My Profile saves a new one.
let myAvatar: string | null | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<(v: string | null) => void>();

export function publishMyAvatar(url: string | null): void {
  myAvatar = url;
  listeners.forEach((l) => l(url));
  try { window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: url })); } catch { /* no window */ }
}

export function useMyAvatar(): string | null {
  const [value, setValue] = useState<string | null>(myAvatar ?? null);
  useEffect(() => {
    listeners.add(setValue);
    if (myAvatar === undefined && !loading) {
      loading = Promise.resolve()
        .then(() => api.get<{ profile_image_url?: string | null; data?: { profile_image_url?: string | null } }>("/api/users/me"))
        .then((r) => { myAvatar = (r?.profile_image_url ?? r?.data?.profile_image_url ?? null) || null; listeners.forEach((l) => l(myAvatar ?? null)); })
        .catch(() => { myAvatar = null; })
        .finally(() => { loading = null; });
    }
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}

/** Test helper: forget the cached photo. */
export function resetMyAvatarForTests(): void { myAvatar = undefined; loading = null; listeners.clear(); }
