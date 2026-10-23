// BF_PORTAL_v849_KS_SILO - the Keystone operations silo (Admin only). Every operations screen talks to KS-Ops through
// ./ksApi; none of them calls BF-Server or sends X-Silo.
// BF_PORTAL_v850_KS_CRM - /silo/ks/crm/* is the Keystone CRM: the BF CRM screens on BF-Server with X-Silo: KS (no KS-Ops
// sign-in needed). Admins and KS-enabled staff; the operations screens stay Admin only.
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { canUseKeystone, canUseKeystoneCrm } from "./ksAccess";
import KsCrm from "./crm/KsCrm";
import { useQuery } from "@tanstack/react-query";
import { ensureKsToken, isKsAccessDenied, ksOpsBaseUrl, KsOpsError } from "./ksApi";
import { Button, card, errorText } from "./ksUi";
import KsDashboard from "./KsDashboard";
import KsLicensees from "./KsLicensees";
import KsLicenseeDetail from "./KsLicenseeDetail";
import KsTickets from "./KsTickets";
import KsTicketDetail from "./KsTicketDetail";
import KsRequests from "./KsRequests";

export function KsSignInGate({ children }: { children: React.ReactNode }) {
  const signIn = useQuery({
    queryKey: ["ks", "auth"],
    queryFn: async () => (await ensureKsToken()).user,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (signIn.isLoading) {
    return <p style={{ color: "var(--ui-text-muted)" }}>Signing in to Keystone operations...</p>;
  }
  if (signIn.error) {
    const denied = isKsAccessDenied(signIn.error);
    const unreachable = signIn.error instanceof KsOpsError && signIn.error.status === 0;
    return (
      <div role="alert" style={{ ...card, maxWidth: 640 }} data-testid="ks-signin-error">
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
          {denied ? "You do not have access to Keystone operations" : "Keystone operations is not available"}
        </h2>
        <p style={{ margin: "0 0 8px" }}>{errorText(signIn.error)}</p>
        {denied ? (
          <p style={{ margin: 0, color: "var(--ui-text-muted)" }}>
            Keystone operations lets in Admin users, and only the emails listed in OPS_ADMIN_EMAILS on KS-Ops when that
            list is set. Ask an owner to add your email there.
          </p>
        ) : (
          <>
            {unreachable ? (
              <p style={{ margin: "0 0 8px", color: "var(--ui-text-muted)" }}>
                Check that KS-Ops is running at {ksOpsBaseUrl()} and that its OPS_ALLOWED_ORIGINS setting includes this
                portal&apos;s address.
              </p>
            ) : null}
            <Button onClick={() => void signIn.refetch()}>Try again</Button>
          </>
        )}
      </div>
    );
  }
  return <>{children}</>;
}

function KsOperations() {
  return (
    <div data-testid="ks-silo" style={{ color: "var(--ui-text)", maxWidth: 1200 }}>
      <KsSignInGate>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<KsDashboard />} />
          <Route path="licensees" element={<KsLicensees />} />
          <Route path="licensees/:id" element={<KsLicenseeDetail />} />
          <Route path="tickets" element={<KsTickets />} />
          <Route path="tickets/:id" element={<KsTicketDetail />} />
          <Route path="requests" element={<KsRequests />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </KsSignInGate>
    </div>
  );
}

export default function KSSilo() {
  const { user } = useAuth();
  const ops = canUseKeystone(user);
  const crm = canUseKeystoneCrm(user);
  return (
    <Routes>
      <Route path="crm/*" element={crm ? <KsCrm /> : <AccessRestricted />} />
      <Route
        path="*"
        element={ops ? <KsOperations /> : crm ? <Navigate to="/silo/ks/crm/contacts" replace /> : <AccessRestricted />}
      />
    </Routes>
  );
}
