import React, { useContext, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthContext, AuthProvider } from "@/auth/AuthContext";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
import IncomingCallModal from "@/components/IncomingCallModal";
import { ActiveCallBanner } from "@/components/ActiveCallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { useServerCallSync } from "@/dialer/useServerCallSync";
import { initVoice } from "@/services/voiceService";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/Lenders";
import AuthProbe from "@/tests/components/AuthProbe";
import { useAuth } from "@/auth/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function SessionGuard() {
  usePortalSessionGuard();
  return null;
}

function VoiceBootstrap() {
  const { user, role } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (!user?.id) return;
    if (!roleIn(role, ["Admin", "Staff"])) return;
    void initVoice(user.id);
  }, [role, user?.id]);

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
    {process.env.NODE_ENV === "test" ? <AuthProbe /> : null}
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lenders/*"
        element={
          <ProtectedRoute>
            <LendersPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default function App() {
  const existingAuthContext = useContext(AuthContext);

  if (existingAuthContext) {
    return (
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    );
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AuthProvider>
  );
}
