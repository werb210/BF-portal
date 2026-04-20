import { useState, type CSSProperties } from "react";
import Card from "@/components/ui/Card";
import ContactsPage from "./contacts/ContactsPage";
import CompaniesPage from "./companies/CompaniesPage";
import RequireRole from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/useAuth";
import { AccessRestricted } from "@/components/AccessRestricted";

type CrmView = "contacts" | "companies";

const CRMContent = () => {
  const [view, setView] = useState<CrmView>("contacts");
  const tabButtonStyle = (tab: CrmView): CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    background: view === tab ? "#dbeafe" : "transparent",
    color: view === tab ? "#1d4ed8" : "#475569",
    borderBottom: view === tab ? "2px solid #2563eb" : "2px solid transparent"
  });

  return (
    <div className="page">
      <Card
        title="CRM Navigation"
        actions={
          <div className="flex gap-2">
            <button style={tabButtonStyle("contacts")} onClick={() => setView("contacts")}>Contacts</button>
            <button style={tabButtonStyle("companies")} onClick={() => setView("companies")}>Companies</button>
          </div>
        }
      >
      </Card>
      {view === "contacts" && <ContactsPage />}
      {view === "companies" && <CompaniesPage />}
    </div>
  );
};

const CRMPage = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (role !== "admin" && role !== "staff") {
    return <AccessRestricted />;
  }

  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <CRMContent />
    </RequireRole>
  );
};

export default CRMPage;
