import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsStore } from "@/state/notifications.store";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import MayaStatus from "@/components/MayaStatus";
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
  const [productionStatus, setProductionStatus] = useState("checking");
  const [presence, setPresence] = useState<"available" | "busy" | "offline">("available");

  const firstName = (user as { first_name?: string; firstName?: string; name?: string } | null)?.first_name
    ?? (user as { firstName?: string } | null)?.firstName
    ?? ((user as { name?: string } | null)?.name?.split(" ")[0] ?? "there");

  const avatarUrl = (user as { avatar_url?: string; profileImage?: string } | null)?.avatar_url
    ?? (user as { profileImage?: string } | null)?.profileImage;
  const avatarInitials = useMemo(() => getInitials((user as { name?: string } | null)?.name), [user]);

  useEffect(() => {
    api<{ status?: string }>("/api/_int/health")
      .then((result) => setProductionStatus(result.status ?? "ok"))
      .catch(() => setProductionStatus("degraded"));
  }, []);

  useEffect(() => {
    const setAvailable = () => api.post("/api/telephony/presence", { status: "available" }).catch(() => {});

    setAvailable();
    const interval = setInterval(() => {
      api.post("/api/telephony/presence/heartbeat", {}).catch(() => {});
    }, 60_000);

    return () => {
      clearInterval(interval);
      api.post("/api/telephony/presence", { status: "offline" }).catch(() => {});
    };
  }, []);

  async function togglePresence() {
    const next = presence === "available" ? "busy" : "available";
    await api.post("/api/telephony/presence", { status: next }).catch(() => {});
    setPresence(next);
  }

  return (
    <header className="topbar" style={{ color: "#0f172a", height: 68, minHeight: 68, maxHeight: 68 }}>
      <div className="topbar__left" style={{ gap: 12 }}>
        <button
          type="button"
          className="topbar__menu-button"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>Welcome back</div>
          <h1 className="topbar__title" style={{ color: "#0b1220", margin: 0, fontSize: 20, fontWeight: 700 }}>
            Hello, {firstName}
          </h1>
        </div>
      </div>
      <div className="topbar__right">
        <BusinessUnitSelector />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${productionStatus === "ok" ? "bg-emerald-600" : productionStatus === "checking" ? "bg-amber-500" : "bg-red-600"}`}
          aria-label="Production readiness status"
        >
          Prod: {productionStatus}
        </span>
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
        <MayaStatus />
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
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1d4ed8", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>
                {avatarInitials}
              </div>
            )}
          </button>
          {isUserMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: 42, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, minWidth: 150, boxShadow: "0 10px 24px rgba(2, 6, 23, 0.12)", zIndex: 20 }}>
              <Link to="/settings/profile" onClick={() => setIsUserMenuOpen(false)} style={{ display: "block", padding: "10px 12px", color: "#0f172a", textDecoration: "none", fontSize: 13 }}>
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
