import { Navigate, Route, Routes } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/useAuth";
import { AccessRestricted } from "@/components/AccessRestricted";
import CrmListPage from "./CrmListPage";
import ContactDetailPage from "./contacts/ContactDetailPage";
import CompanyDetailPage from "./companies/CompanyDetailPage";

const CRMPage = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (role !== "admin" && role !== "staff") {
    return <AccessRestricted />;
  }

  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <Routes>
        <Route index element={<Navigate to="contacts" replace />} />
        <Route path="contacts" element={<CrmListPage />} />
        <Route path="contacts/:id" element={<ContactDetailPage />} />
        <Route path="companies" element={<Navigate to="/crm/contacts" replace />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="*" element={<Navigate to="contacts" replace />} />
      </Routes>
    </RequireRole>
  );
};

export default CRMPage;
