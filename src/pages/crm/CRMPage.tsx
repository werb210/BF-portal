import { useState } from "react";
import Card from "@/components/ui/Card";
import ContactsPage from "./contacts/ContactsPage";
import CompaniesPage from "./companies/CompaniesPage";
import TimelineFeed from "./timeline/TimelineFeed";
import RequireRole from "@/components/auth/RequireRole";
import { ContactSubmissions } from "@/features/support/ContactSubmissions";
import { useAuth } from "@/hooks/useAuth";
import ContinuationLeadsPanel from "./ContinuationLeadsPanel";
import CreditReadinessList from "@/components/CreditReadinessList";
import { AccessRestricted } from "@/components/AccessRestricted";

type CrmView = "contacts" | "companies" | "timeline" | "website-leads" | "continuations" | "credit-readiness";

const CRMContent = () => {
  const [view, setView] = useState<CrmView>("contacts");
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <div className="page">
      <Card
        title="CRM Navigation"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView("contacts")}>Contacts</button>
            <button onClick={() => setView("companies")}>Companies</button>
            <button onClick={() => setView("timeline")}>Global Timeline</button>
            {isAdmin && <button onClick={() => setView("website-leads")}>Website Leads</button>}
            {isAdmin && <button onClick={() => setView("continuations")}>Continuations</button>}
            {isAdmin && <button onClick={() => setView("credit-readiness")}>Credit Readiness</button>}
          </div>
        }
      >
      </Card>
      {view === "contacts" && <ContactsPage />}
      {view === "companies" && <CompaniesPage />}
      {view === "timeline" && (
        <Card title="Global Timeline">
          <TimelineFeed entityType="contact" entityId="c1" />
        </Card>
      )}
      {view === "website-leads" && (
        <Card title="Website Contact Leads">
          <ContactSubmissions isAdmin={isAdmin} />
        </Card>
      )}
      {view === "continuations" && (
        <Card title="Website Continuations">
          <ContinuationLeadsPanel />
        </Card>
      )}
      {view === "credit-readiness" && (
        <Card title="Credit Readiness">
          <CreditReadinessList />
        </Card>
      )}
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
