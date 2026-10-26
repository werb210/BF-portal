// BF_PORTAL_v853_KS_PHONE_SUPPORT - /silo/ks/crm/support/*: the Keystone support queue, a ticket, and (Admins) the
// Keystone phone line settings. Same access as the Keystone CRM (Admins, and staff whose silo access includes KS).
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import KsSupportQueue from "./KsSupportQueue";
import KsSupportTicket from "./KsSupportTicket";
import KsPhoneSettings from "./KsPhoneSettings";

export default function KsSupport() {
  const { user } = useAuth();
  const isAdmin = String((user as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  return (
    <Routes>
      <Route index element={<KsSupportQueue isAdmin={isAdmin} />} />
      <Route path="phone" element={isAdmin ? <KsPhoneSettings /> : <Navigate to="/silo/ks/crm/support" replace />} />
      <Route path=":id" element={<KsSupportTicket />} />
    </Routes>
  );
}
