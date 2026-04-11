import React, { Suspense, lazy, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
import IncomingCallModal from "@/components/IncomingCallModal";
import { ActiveCallBanner } from "@/components/ActiveCallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireRole from "@/components/auth/RequireRole";
import { useServerCallSync } from "@/dialer/useServerCallSync";
import { bootstrapVoice, destroyVoiceDevice } from "@/telephony/bootstrapVoice";
import LoginPage from "@/pages/LoginPage";
import AuthOtpPage from "@/pages/AuthOtpPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/Lenders";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import ApplicationDetail from "@/pages/application/ApplicationDetail";
import ApplicationsPage from "@/pages/applications/ApplicationsPage";
import MayaPage from "@/pages/MayaPage";
import ApplyPage from "@/pages/ApplyPage";
import CRMPage from "@/pages/crm/CRMPage";
import CalendarPage from "@/pages/calendar/CalendarPage";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import MarketingPage from "@/pages/marketing/MarketingPage";
import ReadinessLeadsPage from "@/pages/ReadinessLeadsPage";
import BIDashboardPage from "@/pages/bi/BIDashboardPage";
import BICommissionDashboard from "@/pages/bi/BICommissionDashboard";
import BIReferrersPage from "@/pages/bi/BIReferrersPage";
import BIPipelinePage from "@/pages/applications/bi/BIPipelinePage";
import { useAuth } from "@/auth/AuthContext";
import ToastProvider from "@/components/ui/ToastProvider";
import DialerButton from "@/components/DialerButton";
import MobileShell from "@/mobile/MobileShell";
import IncomingCallOverlay from "./telephony/components/IncomingCallOverlay";
import PortalDialer from "./telephony/components/PortalDialer";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";

function SessionGuard() {
  usePortalSessionGuard();
  return null;
}

function VoiceBootstrap() {
  const { role, authenticated, authStatus } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (!authenticated || authStatus !== "authenticated") return;
    if (!roleIn(role, ["Admin", "Staff"])) return;

    void bootstrapVoice().catch(() => {
      // bootstrapVoice writes a user-facing error state.
    });

    return () => {
      void destroyVoiceDevice();
    };
  }, [authenticated, authStatus, role]);

  return null;
}

function ServerCallSyncBootstrap() {
  const { authenticated, authStatus } = useAuth();
  useServerCallSync({ enabled: authenticated && authStatus === "authenticated" });
  return null;
}

function AppShell() {
  return (
    <>
      <SessionGuard />
      <VoiceBootstrap />
      <ServerCallSyncBootstrap />
      <ActiveCallBanner />
      <IncomingCallModal />
      <DialerButton />
      <PortalDialer />
      <IncomingCallOverlay />
      <MobileShell>
        <Outlet />
      </MobileShell>
    </>
  );
}

function AuthenticatedShell() {
  return <AppShell />;
}

const FloatingChat = lazy(() => import("./components/FloatingChat"));

const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/otp" element={<AuthOtpPage />} />
      <Route element={<AuthenticatedShell />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/applications" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><ApplicationsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/crm/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><CRMPage /></RequireRole></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/communications/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><CommunicationsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/marketing/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff", "Marketing"]}><MarketingPage /></RequireRole></ProtectedRoute>} />
        <Route path="/portal/readiness" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><ReadinessLeadsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/portal/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<Navigate to="/portal" replace />} />
        <Route
          path="/pipeline"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff", "Marketing"]}>
                <PipelinePage />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
        <Route path="/lenders/*" element={<ProtectedRoute><LendersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff", "Marketing"]}><div>Reports</div></RequireRole></ProtectedRoute>} />
        <Route path="/maya" element={<ProtectedRoute><MayaPage /></ProtectedRoute>} />
        <Route
          path="/bi"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff"]}>
                <BIDashboardPage />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bi/pipeline"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff", "Marketing"]}>
                <BIPipelinePage />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bi/commissions"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff"]}>
                <BICommissionDashboard />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bi/referrers"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff"]}>
                <BIReferrersPage />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route path="/apply" element={<ApplyPage />} />
      </Route>
    </Routes>
  </>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Suspense fallback={null}>
          <FloatingChat />
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  );
}
