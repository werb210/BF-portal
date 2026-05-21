import BiLendersPage from "@/pages/BiLendersPage";
// BF_PORTAL_BLOCK_v90_REVERT_LENDER_SPA_v1
import React, { Suspense, lazy, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
// BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE2_v1 -- IncomingCallModal
// is dormant after Phase 1 (no event source). Mount removed below; file
// is kept on disk and deleted in Phase 3.
import InstallPromptBanner from "@/components/InstallPromptBanner";
import { IOSInstallBanner } from "@/components/IOSInstallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireRole from "@/components/auth/RequireRole";
import Login from "@/pages/Login";
import Verify from "@/pages/Verify";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/lenders/LendersPage";
// BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE
import PipelineRouter from "@/pages/pipeline/PipelineRouter";
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
// BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1 — import removed;
// /bi/pipeline now redirects and PipelineRouter no longer renders it.
// The orphan component is still exported in case test files reference it.
import Leads from "@/pages/Leads";
import IssueInboxPage from "@/pages/IssueInboxPage";
import AiCommsPage from "@/pages/AiCommsPage";
import AIChatDashboard from "@/pages/AIChatDashboard";
import AIKnowledgeManager from "@/pages/admin/AIKnowledgeManager";
// BF_PORTAL_BLOCK_v45_ADMIN_DEAD_ROUTE_REMOVAL_v1
// Five removed admin pages all call /api/admin/* endpoints that do not exist
// on BF-Server (verified: /api/admin/ai-documents, /api/admin/issue-reports,
// /api/admin/website-leads, /api/admin/live-chat-queue,
// /api/admin/conversions all return 404). The pages render empty data
// forever, no error UI, no loading state -- silent broken admin surface.
// Sidebar/nav doesn't link to any of them so the only way to reach them is
// by URL. Removing the imports + Route definitions eliminates the broken
// surface. The page component files stay in src/pages/admin/ as orphans;
// can be deleted in a follow-up cleanup pass.
import GlobalAdmin from "@/pages/GlobalAdmin";
import AnalyticsDashboard from "@/pages/admin/AnalyticsDashboard";
import LeadsPage from "@/pages/admin/LeadsPage";
import AiPolicyEditorPage from "@/pages/admin/AiPolicyEditorPage";
import Operations from "@/pages/admin/Operations";
import MayaIntelligence from "@/pages/admin/MayaIntelligence";
import AiLiveChatPage from "@/pages/ai/AiLiveChatPage";
import AiChatDashboard from "@/pages/admin/AiChatDashboard";
import AiIssueReports from "@/pages/admin/AiIssueReports";
import CreditReadiness from "@/pages/CreditReadiness";
import ReferrerPortalLayout from "@/pages/referrer/ReferrerPortalLayout";
import ReferrerLoginPage from "@/pages/referrer/ReferrerLoginPage";
// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
import BISilo from "@/silos/bi/BISilo";
import LenderPortalPage from "@/pages/lender/LenderPortalPage";
import LenderLoginPage from "@/pages/lender/LenderLoginPage";
import LenderProfilePage from "@/pages/lender/LenderProfilePage";
import { useAuth } from "@/auth/AuthContext";
import ToastProvider from "@/components/ui/ToastProvider";
import { BusinessUnitProvider } from "@/context/BusinessUnitContext";
import { SiloProvider } from "@/context/SiloContext";
import AppLayout from "@/layouts/AppLayout";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { applicationDetailElement } from "@/pages/applications/applicationDetailRoute";
import { queryClient } from "@/lib/queryClient";
import { sanitizeOtpFlowStateOnBoot } from "@/auth/otpFlow";
import { getAuthToken } from "@/lib/authToken";
import { refreshO365TokenIfPossible } from "@/lib/o365";

function SessionGuard() {
  usePortalSessionGuard();
  return null;
}

import DialerProvider from "@/dialer/DialerProvider";
import DialerPanel from "@/dialer/components/DialerPanel";
import FloatingDialerButton from "@/dialer/components/FloatingDialerButton";

// VoiceBootstrap removed in v225. The in-portal Twilio Voice SDK dialer
// was ripped in v224; the no-op bootstrap stub had no remaining purpose.
// A future dialer should hang a new component here under a clear spec.

function AppShell() {
  return (
    <>
      <SessionGuard />
      <DialerProvider />
      <DialerPanel />
      <FloatingDialerButton />
      {/* BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE2_v1 --
          <IncomingCallModal /> removed. IncomingCallOverlay below
          is the single inbound UI. */}
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
    void refreshO365TokenIfPossible();
    // BF_PORTAL_BLOCK_v323_O365_PERIODIC_REFRESH_APP_LEVEL_v1
    // Pre-fix the 30-min periodic /o365-refresh tick lived inside
    // ProfileSettings.tsx (around line 322) — so it only fired while
    // the user was viewing /settings. Navigate anywhere else and the
    // setInterval cleanup ran, the timer stopped, and the stored access
    // token expired (~1h) without ever being renewed. Move the timer
    // to AppRoutes which stays mounted for the entire authed session,
    // so refresh runs continuously regardless of which page the user
    // is viewing. The 30-min cadence is well below the ~1h Microsoft
    // access-token lifetime; refreshO365TokenIfPossible internally
    // checks /o365-status first and only POSTs /o365-refresh when the
    // server reports a refreshable token, so the call is a no-op for
    // staff who never connected O365 in the first place.
    const id = window.setInterval(() => {
      void refreshO365TokenIfPossible();
    }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <InstallPromptBanner />
      <IOSInstallBanner />
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
                {/* BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE — picks BI vs BF page based on active silo */}
                <PipelineRouter />
              </RequireRole>
            </ProtectedRoute>
          }
        />
        <Route path="/applications/:id/*" element={<ProtectedRoute>{applicationDetailElement}</ProtectedRoute>} />
        {/* BF_PORTAL_BLOCK_v91_BI_LENDERS_PAGE_v1 */}
        <Route path="/bi-lenders" element={<ProtectedRoute><BiLendersPage /></ProtectedRoute>} />
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
        {/* BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1 — orphan /bi/pipeline redirects to canonical */}
        <Route path="/bi/pipeline" element={<Navigate to="/silo/bi/pipeline" replace />} />
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
        {/* BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 — mount BI silo shell.
            BISilo has its own nested router (dashboard/pipeline/crm/lender/
            referrer/marketing/settings). Without this route the v200 BI nav
            links all 404. */}
        <Route
          path="/silo/bi/*"
          element={
            <ProtectedRoute>
              <RequireRole roles={["Admin", "Staff", "Ops"]}>
                <BISilo />
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
        {/* BF_PORTAL_BLOCK_v45_ADMIN_DEAD_ROUTE_REMOVAL_v1 -- five routes
            removed here (/admin/ai-knowledge, /admin/issue-reports,
            /admin/website-leads, /admin/live-chat, /admin/conversions)
            because their pages call /api/admin/* endpoints that don't
            exist on BF-Server. See import block comment above. */}
        <Route path="/admin/support" element={<ProtectedRoute><RequireRole roles={["Admin"]}><GlobalAdmin /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><RequireRole roles={["Admin"]}><AnalyticsDashboard /></RequireRole></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute><RequireRole roles={["Admin"]}><LeadsPage /></RequireRole></ProtectedRoute>} />
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
