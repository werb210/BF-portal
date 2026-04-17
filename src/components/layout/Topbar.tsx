import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import { useNotificationsStore } from "@/state/notifications.store";
import { getRoleLabel, resolveUserRole } from "@/utils/roles";
import { useDialerStore } from "@/state/dialer.store";
import Button from "../ui/Button";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import PushNotificationCta from "@/components/PushNotificationCta";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import MayaStatus from "@/components/MayaStatus";
import { api } from "@/api";

type TopbarProps = {
  onToggleSidebar: () => void;
  onOpenMaya?: () => void;
};

const Topbar = ({ onToggleSidebar, onOpenMaya }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { silo } = useSilo();
  const unreadCount = useNotificationsStore(
    (state) => state.notifications.filter((item) => !item.read).length
  );
  const openDialer = useDialerStore((state) => state.openDialer);
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
      <div className="topbar__inner">
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
            className="topbar__logo"
          />
          <div className="topbar__title-stack">
            <h1 className="topbar__title">Boreal Financial</h1>
            <span className="topbar__subtitle">Business Unit: {silo}</span>
          </div>
        </div>

        <div className="topbar__right">
          <div className="topbar__cluster">
            <BusinessUnitSelector />
            <button type="button" className="topbar__chip topbar__chip--maya" onClick={onOpenMaya}>
              Maya
            </button>
            {liveCount > 0 && <span className="topbar__chip topbar__chip--danger">Live {liveCount}</span>}
            <span
              className={`topbar__chip ${
                productionStatus === "ok"
                  ? "topbar__chip--ok"
                  : productionStatus === "checking"
                    ? "topbar__chip--warn"
                    : "topbar__chip--danger"
              }`}
              aria-label="Production readiness status"
            >
              Prod: {productionStatus}
            </span>
            <MayaStatus />
          </div>

          <button
            type="button"
            className="topbar__icon-button"
            aria-label="Open dialer"
            onClick={() => openDialer({ source: "global" })}
          >
            ☎︎
          </button>

          <div className="relative">
            <button
              type="button"
              className="topbar__chip"
              aria-label="Open notifications"
              onClick={() => setIsCenterOpen((prev) => !prev)}
            >
              Notifications
              {unreadCount > 0 && (
                <span className="topbar__chip-badge">
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
      </div>
    </header>
  );
};

export default Topbar;
