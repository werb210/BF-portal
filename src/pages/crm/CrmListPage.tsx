import { useState, type CSSProperties } from "react";
import ContactsPage from "./contacts/ContactsPage";
import CompaniesPage from "./companies/CompaniesPage";

type View = "contacts" | "companies";

export default function CrmListPage(): JSX.Element {
  const [view, setView] = useState<View>("contacts");
  return (
    <div style={page}>
      <div style={toggleRow}>
        <button onClick={() => setView("contacts")} style={btn(view === "contacts")}>Contacts</button>
        <button onClick={() => setView("companies")} style={btn(view === "companies")}>Companies</button>
      </div>
      {view === "contacts" ? <ContactsPage /> : <CompaniesPage />}
    </div>
  );
}

const page: CSSProperties = { background: "#fff", color: "#000" };
const toggleRow: CSSProperties = {
  display: "flex", gap: 8, padding: "16px 24px 0 24px",
  borderBottom: "1px solid #eaf0f6",
};
function btn(active: boolean): CSSProperties {
  return {
    padding: "8px 16px",
    border: "none",
    background: "transparent",
    color: active ? "#0091ae" : "#33475b",
    borderBottom: active ? "2px solid #0091ae" : "2px solid transparent",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  };
}
