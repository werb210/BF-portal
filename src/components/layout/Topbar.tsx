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
import { logger } from "@/utils/logger";
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
  const [leadCount, setLeadCount] = useState(0);
  const [productionStatus, setProductionStatus] = useState("checking");

  useEffect(() => {
    api<{ count?: number }>("/api/crm/leads/count")
      .then((result) => setLeadCount(result.count ?? 0))
      .catch(() => setLeadCount(0));
  }, []);

  useEffect(() => {
    api<{ status?: string }>("/api/_int/production-readiness")
      .then((result) => {
        logger.info("Production readiness payload", { data: result });
        setProductionStatus(result.status ?? "ok");
      })
      .catch(() => setProductionStatus("degraded"));
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await api<{ count?: number }>("/api/support/live/count");
        setLiveCount(result.count ?? 0);
      } catch {
        setLiveCount(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
          className="h-10 w-auto object-contain"
        />
        <div className="topbar__title-stack">
          <h1 className="topbar__title">Boreal Financial</h1>
          <span className="topbar__subtitle">Business Unit: {silo}</span>
        </div>
      </div>
      <div className="topbar__right">
        <BusinessUnitSelector />
        <button
          type="button"
          className="relative rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:border-slate-300"
          onClick={onOpenMaya}
        >
          Maya
        </button>
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
        {leadCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white" aria-label="Website lead count">
            Leads {leadCount}
          </span>
        )}
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
