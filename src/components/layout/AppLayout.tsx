import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SystemBanner from "@/components/SystemBanner";
import ApiErrorToast from "./ApiErrorToast";
import NotificationToast from "@/components/notifications/NotificationToast";
import { useNotificationPermissionPrompt } from "@/hooks/useNotificationPermissionPrompt";
import VoiceDialer from "@/components/dialer/VoiceDialer";
import DialerErrorBoundary from "@/components/dialer/DialerErrorBoundary";
import MayaPanel from "@/components/maya/MayaPanel";
import ErrorBoundary from "@/core/ErrorBoundary";
import { usePresence } from "@/hooks/usePresence";
import "@/styles/globals.css";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mayaOpen, setMayaOpen] = useState(false);
  const location = useLocation();
  useNotificationPermissionPrompt();
  usePresence();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${sidebarOpen ? "app-shell--menu-open" : ""}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-shell__content">
        <SystemBanner />
        <ApiErrorToast />
        <NotificationToast />
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenMaya={() => setMayaOpen(true)}
        />
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
      <DialerErrorBoundary>
        <VoiceDialer />
      </DialerErrorBoundary>
      <ErrorBoundary>
        <MayaPanel open={mayaOpen} onClose={() => setMayaOpen(false)} />
      </ErrorBoundary>
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
