import React, { Suspense, lazy, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
import IncomingCallModal from "@/components/IncomingCallModal";
import { ActiveCallBanner } from "@/components/ActiveCallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireRole from "@/components/auth/RequireRole";
import { useServerCallSync } from "@/dialer/useServerCallSync";
import { bootstrapVoice, destroyVoiceDevice } from "@/telephony/bootstrapVoice";
import Login from "@/pages/Login";
import Verify from "@/pages/Verify";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/lenders/LendersPage";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import ApplicationDetail from "@/pages/application/ApplicationDetail";
import MayaPage from "@/pages/MayaPage";
import ApplyPage from "@/pages/ApplyPage";
import CRMPage from "@/pages/crm/CRMPage";
import CalendarPage from "@/pages/calendar/CalendarPage";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import MarketingPage from "@/pages/marketing/MarketingPage";
import BIDashboardPage from "@/pages/bi/BIDashboardPage";
import BICommissionDashboard from "@/pages/bi/BICommissionDashboard";
import BIReferrersPage from "@/pages/bi/BIReferrersPage";
import BIPipelinePage from "@/pages/applications/bi/BIPipelinePage";
import Leads from "@/pages/Leads";
import IssueInboxPage from "@/pages/IssueInboxPage";
import AiCommsPage from "@/pages/AiCommsPage";
import AIChatDashboard from "@/pages/AIChatDashboard";
import AIKnowledgeManager from "@/pages/admin/AIKnowledgeManager";
import AIKnowledgeBasePage from "@/pages/admin/AIKnowledgeBasePage";
import GlobalAdmin from "@/pages/GlobalAdmin";
import AnalyticsDashboard from "@/pages/admin/AnalyticsDashboard";
import IssueReportsPage from "@/pages/admin/IssueReportsPage";
import WebsiteLeadsPage from "@/pages/admin/WebsiteLeadsPage";
import LeadsPage from "@/pages/admin/LeadsPage";
import LiveChatQueuePage from "@/pages/admin/LiveChatQueuePage";
import ConversionDashboardPage from "@/pages/admin/ConversionDashboardPage";
import AiPolicyEditorPage from "@/pages/admin/AiPolicyEditorPage";
import Operations from "@/pages/admin/Operations";
import MayaIntelligence from "@/pages/admin/MayaIntelligence";
import AiLiveChatPage from "@/pages/ai/AiLiveChatPage";
import AiChatDashboard from "@/pages/admin/AiChatDashboard";
import AiIssueReports from "@/pages/admin/AiIssueReports";
import CreditReadiness from "@/pages/CreditReadiness";
import ReferrerPortalLayout from "@/pages/referrer/ReferrerPortalLayout";
import ReferrerLoginPage from "@/pages/referrer/ReferrerLoginPage";
import LenderPortalPage from "@/pages/lender/LenderPortalPage";
import LenderLoginPage from "@/pages/lender/LenderLoginPage";
import LenderProfilePage from "@/pages/lender/LenderProfilePage";
import { useAuth } from "@/auth/AuthContext";
import ToastProvider from "@/components/ui/ToastProvider";
import { BusinessUnitProvider } from "@/context/BusinessUnitContext";
import { SiloProvider } from "@/context/SiloContext";
import AppLayout from "@/layouts/AppLayout";
import IncomingCallOverlay from "./telephony/components/IncomingCallOverlay";
import PortalDialer from "./telephony/components/PortalDialer";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { sanitizeOtpFlowStateOnBoot } from "@/auth/otpFlow";
import { getAuthToken } from "@/lib/authToken";

function SessionGuard() {
  usePortalSessionGuard();
  return null;
}

function VoiceBootstrap() {
  const { role, authenticated, authStatus } = useAuth();

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
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
      <PortalDialer />
      <IncomingCallOverlay />
      <AppLayout />
    </>
  );
}

function AuthenticatedShell() {
  return <AppShell />;
}

const FloatingChat = lazy(() => import("./components/FloatingChat"));

const AppRoutes = () => {
  const token = getAuthToken();

  useEffect(() => {
    sanitizeOtpFlowStateOnBoot();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/referrer/login" element={<ReferrerLoginPage />} />
        <Route path="/referrer/*" element={<ReferrerPortalLayout />} />
        <Route path="/lender-portal/login" element={<LenderLoginPage />} />
        <Route path="/lender-portal/profile" element={<LenderProfilePage />} />
        <Route path="/lender-portal/deals" element={<LenderPortalPage />} />
        <Route path="/lender-portal/deals/:id" element={<LenderPortalPage />} />
        <Route path="/lender-portal/products" element={<LenderPortalPage />} />
        <Route element={token ? <AuthenticatedShell /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/applications" element={<Navigate to="/pipeline" replace />} />
        <Route path="/crm/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><CRMPage /></RequireRole></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/communications/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><CommunicationsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/:tab" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/marketing/*" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff", "Ops"]}><MarketingPage /></RequireRole></ProtectedRoute>} />
        <Route path="/portal/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<Navigate to="/portal" replace />} />
        <Route
          path="/pipeline"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff", "Ops"]}>
                <PipelinePage />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
        <Route path="/lenders/*" element={<ProtectedRoute><LendersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff", "Ops"]}><div>Reports</div></RequireRole></ProtectedRoute>} />
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
              <RequireRole roles={["Admin", "Staff", "Ops"]}>
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
        <Route path="/leads" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><Leads /></RequireRole></ProtectedRoute>} />
        <Route path="/issues" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><IssueInboxPage /></RequireRole></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AiCommsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/ai-chat" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AIChatDashboard /></RequireRole></ProtectedRoute>} />
        <Route path="/ai-comms" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AiCommsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/ai" element={<ProtectedRoute><RequireRole roles={["Admin"]}><AIKnowledgeManager /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/ai-knowledge" element={<ProtectedRoute><RequireRole roles={["Admin"]}><AIKnowledgeBasePage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute><RequireRole roles={["Admin"]}><GlobalAdmin /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><RequireRole roles={["Admin"]}><AnalyticsDashboard /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/issue-reports" element={<ProtectedRoute><RequireRole roles={["Admin"]}><IssueReportsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/website-leads" element={<ProtectedRoute><RequireRole roles={["Admin"]}><WebsiteLeadsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute><RequireRole roles={["Admin"]}><LeadsPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/live-chat" element={<ProtectedRoute><RequireRole roles={["Admin"]}><LiveChatQueuePage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/conversions" element={<ProtectedRoute><RequireRole roles={["Admin"]}><ConversionDashboardPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/ai-policy" element={<ProtectedRoute><RequireRole roles={["Admin"]}><AiPolicyEditorPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/operations" element={<ProtectedRoute><RequireRole roles={["Admin"]}><Operations /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/maya" element={<ProtectedRoute><RequireRole roles={["Admin"]}><MayaIntelligence /></RequireRole></ProtectedRoute>} />
        <Route path="/portal/ai" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AiLiveChatPage /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/ai/chats" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AiChatDashboard /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/ai/issues" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><AiIssueReports /></RequireRole></ProtectedRoute>} />
        <Route path="/continuations" element={<ProtectedRoute><RequireRole roles={["Admin", "Staff"]}><CreditReadiness /></RequireRole></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BusinessUnitProvider>
        <SiloProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            <Suspense fallback={null}>
              <FloatingChat />
            </Suspense>
          </ToastProvider>
        </SiloProvider>
      </BusinessUnitProvider>
    </QueryClientProvider>
  );
}
