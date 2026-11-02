import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/useAuth";
import { AccessRestricted } from "@/components/AccessRestricted";
import CrmListPage from "./CrmListPage";
import ContactDetailPage from "./contacts/ContactDetailPage";
import CompanyDetailPage from "./companies/CompanyDetailPage";
import ActiveContractsPage, { ContractPage } from "@/features/activeContracts/ActiveContractsPage"; // BF_PORTAL_v864_ACTIVE_CONTRACTS

// BF_PORTAL_v878_NAV_REVENUE - CRM's own tabs: contacts and companies (one list), and Active Contracts, which used to be
// a separate sidebar item. Shown on the two list pages, not on a single record.
export function CrmTabs() {
  const { pathname } = useLocation();
  if (!/^\/crm\/(contacts|active-contracts)\/?$/.test(pathname)) return null;
  const tab = (to: string, label: string) => (
    <NavLink to={to} role="tab" aria-selected={pathname.startsWith(to)}
      style={() => ({ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none",
        color: pathname.startsWith(to) ? "var(--ui-text)" : "var(--ui-text-muted)",
        background: pathname.startsWith(to) ? "var(--ui-surface-2, rgba(127,127,127,0.15))" : "transparent" })}>{label}</NavLink>
  );
  return (
    <div role="tablist" aria-label="CRM" style={{ display: "flex", gap: 6, padding: "12px 16px 0", flexWrap: "wrap" }}>
      {tab("/crm/contacts", "Contacts & companies")}
      {tab("/crm/active-contracts", "Active Contracts")}
    </div>
  );
}

const CRMPage = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (role !== "admin" && role !== "staff") {
    return <AccessRestricted />;
  }

  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <CrmTabs />
      <Routes>
        <Route index element={<Navigate to="contacts" replace />} />
        <Route path="contacts" element={<CrmListPage />} />
        <Route path="contacts/:id" element={<ContactDetailPage />} />
        <Route path="companies" element={<Navigate to="/crm/contacts" replace />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="active-contracts" element={<ActiveContractsPage />} /> {/* BF_PORTAL_v864_ACTIVE_CONTRACTS */}
        <Route path="active-contracts/:id" element={<ContractPage />} />
        <Route path="*" element={<Navigate to="contacts" replace />} />
      </Routes>
    </RequireRole>
  );
};

export default CRMPage;
