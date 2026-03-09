import React, { useContext, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthContext, AuthProvider } from "@/auth/AuthContext";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
import IncomingCallModal from "@/components/IncomingCallModal";
import { ActiveCallBanner } from "@/components/ActiveCallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireRole from "@/components/auth/RequireRole";
import { useServerCallSync } from "@/dialer/useServerCallSync";
import { bootstrapVoice } from "@/telephony/bootstrapVoice";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/Lenders";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
import ApplicationDetail from "@/pages/application/ApplicationDetail";
import AuthProbe from "@/tests/components/AuthProbe";
import { useAuth } from "@/auth/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ToastProvider from "@/components/ui/ToastProvider";
import { updatePipelineStage } from "@/api/pipeline";
import DialerButton from "@/components/DialerButton";
import MobileShell from "@/mobile/MobileShell";
import IncomingCallOverlay from "./telephony/components/IncomingCallOverlay";
import PortalDialer from "./telephony/components/PortalDialer";

function SessionGuard() {
  usePortalSessionGuard();
  return null;
}

function VoiceBootstrap() {
  const { role } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (!roleIn(role, ["Admin", "Staff"])) return;

    void bootstrapVoice().catch(() => {
      // bootstrapVoice writes a user-facing error state.
    });
  }, [role]);

  return null;
}

function ServerCallSyncBootstrap() {
  useServerCallSync();
  return null;
}

const AppRoutes = () => (
  <BrowserRouter>
    <SessionGuard />
    <VoiceBootstrap />
    <ServerCallSyncBootstrap />
    <ActiveCallBanner />
    <IncomingCallModal />
    <DialerButton />
    <PortalDialer />
    {process.env.NODE_ENV === "test" ? <AuthProbe /> : null}
    <MobileShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route
          path="/pipeline"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff", "Marketing"]}>
                <PipelineEngineProvider
                  config={{
                    businessUnit: "BF",
                    api: {
                      fetchPipeline: pipelineApi.fetchPipeline,
                      updateStage: updatePipelineStage,
                      exportApplications: pipelineApi.exportApplications
                    }
                  }}
                >
                  <PipelinePage />
                </PipelineEngineProvider>
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route path="/applications" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
        <Route path="/lenders/*" element={<ProtectedRoute><LendersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff", "Marketing"]}><div>Reports</div></RequireRole></ProtectedRoute>} />
      </Routes>
    </MobileShell>
  </BrowserRouter>
);

export default function App() {
  const existingAuthContext = useContext(AuthContext);
  const queryClient = useMemo(() => new QueryClient(), []);

  if (existingAuthContext) {
    return (
      <QueryClientProvider client={queryClient}><ErrorBoundary>
        <ToastProvider>
          <>
            <AppRoutes />
            <IncomingCallOverlay />
          </>
        </ToastProvider>
      </ErrorBoundary></QueryClientProvider>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}><ErrorBoundary>
        <ToastProvider>
          <>
            <AppRoutes />
            <IncomingCallOverlay />
          </>
        </ToastProvider>
      </ErrorBoundary></QueryClientProvider>
    </AuthProvider>
  );
}
