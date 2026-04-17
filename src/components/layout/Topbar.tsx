import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import { useNotificationsStore } from "@/state/notifications.store";
import { getRoleLabel, resolveUserRole } from "@/utils/roles";
import Button from "../ui/Button";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import PushNotificationCta from "@/components/PushNotificationCta";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import MayaStatus from "@/components/MayaStatus";
import { api } from "@/api";
type TopbarProps = {
  onToggleSidebar: () => void;
};

const Topbar = ({ onToggleSidebar }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { silo } = useSilo();
  // silo retained for future use but not displayed in header
  void silo;
  const unreadCount = useNotificationsStore(
    (state) => state.notifications.filter((item) => !item.read).length
  );
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [productionStatus, setProductionStatus] = useState("checking");

  useEffect(() => {
    api<{ status?: string }>("/api/_int/health")
      .then((result) => setProductionStatus(result.status ?? "ok"))
      .catch(() => setProductionStatus("degraded"));
  }, []);

  useEffect(() => {
    const userRole = (user as { role?: string } | null)?.role?.toLowerCase();
    if (userRole !== "admin") {
      setLiveCount(0);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const result = await api<{ liveCount?: number; liveChatCount?: number }>("/api/staff/overview");
        setLiveCount(result.liveChatCount ?? result.liveCount ?? 0);
      } catch {
        setLiveCount(0);
      }
    }, 30000);

    void (async () => {
      try {
        const result = await api<{ liveCount?: number; liveChatCount?: number }>("/api/staff/overview");
        setLiveCount(result.liveChatCount ?? result.liveCount ?? 0);
      } catch {
        setLiveCount(0);
      }
    })();

    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__menu-button"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <img
          src="/images/Header.png"
          alt="Boreal Financial"
          className="h-12 w-auto object-contain"
          style={{ minWidth: 48 }}
        />
        <h1 className="topbar__title" style={{ color: "#0b1220", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Boreal Financial
        </h1>
      </div>
      <div className="topbar__right">
        <BusinessUnitSelector />
        {liveCount > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white" aria-label="Live chat queue count">
            Live {liveCount}
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${productionStatus === "ok" ? "bg-emerald-600" : productionStatus === "checking" ? "bg-amber-500" : "bg-red-600"}`}
          aria-label="Production readiness status"
        >
          Prod: {productionStatus}
        </span>
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
        <PushNotificationCta />
        {user && (
          <div className="topbar__user">
            <div>
              <div className="topbar__user-name">{user.name}</div>
              <div className="topbar__user-role">
                {getRoleLabel(resolveUserRole((user as { role?: string | null } | null)?.role ?? null))}
              </div>
            </div>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
