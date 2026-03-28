import React, { useContext, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Outlet, Route, Routes, useInRouterContext } from "react-router-dom";
import { AuthContext, AuthProvider } from "@/auth/AuthContext";
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
import { useAuth } from "@/auth/AuthContext";
import ToastProvider from "@/components/ui/ToastProvider";
import DialerButton from "@/components/DialerButton";
import MobileShell from "@/mobile/MobileShell";
import IncomingCallOverlay from "./telephony/components/IncomingCallOverlay";
import PortalDialer from "./telephony/components/PortalDialer";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { requireAuth } from "@/lib/api";

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
  const { authStatus, authenticated } = useAuth();

  if (authStatus === "loading") {
    return null;
  }

  if (!authenticated || authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/otp" element={<AuthOtpPage />} />
      <Route path="/otp" element={<AuthOtpPage />} />
      <Route element={<AuthenticatedShell />}>
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/portal" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
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
      </Route>
    </Routes>
  </>
);

export default function App() {
  const existingAuthContext = useContext(AuthContext);
  const inRouterContext = useInRouterContext();
  const queryClient = useMemo(() => new QueryClient(), []);

  useEffect(() => {
    try {
      requireAuth();
    } catch {
      console.warn("No auth token found");
    }
  }, []);

  const withOptionalRouter = (children: React.ReactNode) => {
    if (inRouterContext) return children;
    const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };

  if (existingAuthContext) {
    return withOptionalRouter(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return withOptionalRouter(
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
