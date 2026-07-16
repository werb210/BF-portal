import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/authToken";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsStore } from "@/state/notifications.store";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { api } from "@/api";

type TopbarProps = {
  onToggleSidebar: () => void;
};

const getInitials = (fullName?: string | null) => {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
};

const Topbar = ({ onToggleSidebar }: TopbarProps) => {
  const { user, logout } = useAuth();
  const unreadCount = useNotificationsStore((state) => state.notifications.filter((item) => !item.read).length);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [presence, setPresence] = useState<"available" | "busy" | "offline">("available");

  const firstName = (user as { first_name?: string; firstName?: string; name?: string } | null)?.first_name
    ?? (user as { firstName?: string } | null)?.firstName
    ?? ((user as { name?: string } | null)?.name?.split(" ")[0] ?? "");
  const greeting = firstName ? `Hello, ${firstName}` : "Hello";

  const avatarUrl = (user as { avatar_url?: string; profileImage?: string; profile_image_url?: string } | null)?.avatar_url
    ?? (user as { profileImage?: string } | null)?.profileImage
    ?? (user as { profile_image_url?: string } | null)?.profile_image_url; // BF_PORTAL_AVATAR_FIX_v1
  const avatarInitials = useMemo(() => {
    const resolvedFirstName = (user as { first_name?: string; firstName?: string } | null)?.first_name
      ?? (user as { firstName?: string } | null)?.firstName;
    if (resolvedFirstName?.trim()) return resolvedFirstName.trim().charAt(0).toUpperCase();
    return getInitials((user as { name?: string } | null)?.name);
  }, [user]);

  // BF_HEARTBEAT_AUTH_GUARD_v34 — skip heartbeat when no JWT is present.
  // Without this, the 30s interval keeps firing after JWT expiry and the
  // console floods with `non-session 401 from .../presence/heartbeat`.
  useEffect(() => {
    // v220 (B): if the topbar mounts before auth is in localStorage
    // (refresh / cold login race), setAvailable's hasAuth check
    // silently no-ops and the staff_presence row is never written
    // for this session. The 30s heartbeat is UPDATE-only and won't
    // create the row either. Retry whenever the auth_token storage
    // event fires until we successfully POST status=available.
    const hasAuth = () => Boolean(getAuthToken());
    let presenceWritten = false;
    const setAvailable = async () => {
      if (presenceWritten) return;
      if (!hasAuth()) return;
      try {
        await api.post("/api/telephony/presence", { status: "available" });
        presenceWritten = true;
      } catch {
        // non-fatal; storage listener or next mount may retry
      }
    };

    void setAvailable();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "auth_token" && ev.newValue) {
        void setAvailable();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }

    const interval = setInterval(() => {
      if (!hasAuth()) return;
      // If the presence row was never written, try the full upsert
      // again rather than a no-op UPDATE heartbeat.
      if (!presenceWritten) {
        void setAvailable();
        return;
      }
      api.post("/api/telephony/presence/heartbeat", {}).catch(() => {});
    }, 30_000);

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
      if (!hasAuth()) return;
      api.post("/api/telephony/presence", { status: "offline" }).catch(() => {});
    };
  }, []);

  async function togglePresence() {
    const next = presence === "available" ? "busy" : "available";
    await api.post("/api/telephony/presence", { status: next }).catch(() => {});
    setPresence(next);
  }

  return (
    <header className="topbar" style={{ color: "var(--ui-text)", height: 68, minHeight: 68, maxHeight: 68 }}>
      <div className="topbar__left" style={{ gap: 12 }}>
        <button
          type="button"
          className="topbar__menu-button"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-neutral)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>
              {avatarInitials}
            </div>
          )}
          <h1 className="topbar__title" style={{ color: "var(--ui-text)", margin: 0, fontSize: 20, fontWeight: 700 }}>
            {greeting}
          </h1>
        </div>
      </div>
      <div className="topbar__right">
        <BusinessUnitSelector />
        <button
          onClick={() => void togglePresence()}
          title={`Status: ${presence} — click to toggle`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "1px solid",
            borderColor: presence === "available" ? "#22c55e" : "#f59e0b",
            borderRadius: 20,
            padding: "3px 10px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            color: presence === "available" ? "#22c55e" : "#f59e0b",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: presence === "available" ? "#22c55e" : "#f59e0b", flexShrink: 0 }} />
          {presence === "available" ? "Available" : "Busy"}
        </button>
        <div className="relative">
          <button
            type="button"
            className="relative rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:border-slate-300"
            aria-label="Open notifications"
            onClick={() => setIsCenterOpen((prev) => !prev)}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {isCenterOpen && <NotificationCenter onClose={() => setIsCenterOpen(false)} />}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-label="Open user menu"
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-neutral)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>
                {avatarInitials}
              </div>
            )}
          </button>
          {isUserMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: 42, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, minWidth: 150, boxShadow: "0 10px 24px rgba(2, 6, 23, 0.12)", zIndex: 20 }}>
              <Link to="/settings/profile" onClick={() => setIsUserMenuOpen(false)} style={{ display: "block", padding: "10px 12px", color: "var(--ui-text)", textDecoration: "none", fontSize: 13 }}>
                My Profile
              </Link>
              <button type="button" onClick={logout} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "10px 12px", fontSize: 13, cursor: "pointer", color: "#dc2626" }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
