import { useEffect, useState, type CSSProperties } from "react";
import ContactsPage from "./contacts/ContactsPage";
import CompaniesPage from "./companies/CompaniesPage";
import { api } from "@/api";
import { useSilo } from "@/hooks/useSilo";

type View = "contacts" | "companies";

// BF_PORTAL_CRM_COUNT_BADGES_v1 - show live silo-scoped totals on the CRM tabs
// (e.g. "Contacts (1627)"). Refetches whenever the selected silo changes.
export default function CrmListPage(): JSX.Element {
  const [view, setView] = useState<View>("contacts");
  const { silo } = useSilo();
  const [counts, setCounts] = useState<{ contacts: number | null; companies: number | null }>({ contacts: null, companies: null });
  useEffect(() => {
    let alive = true;
    api
      .get<{ data?: { contacts?: number; companies?: number }; contacts?: number; companies?: number }>(
        `/api/crm/counts?silo=${String(silo).toLowerCase()}`,
      )
      .then((r) => {
        const d = (r as { data?: { contacts?: number; companies?: number } }).data ?? (r as { contacts?: number; companies?: number });
        if (alive) setCounts({ contacts: d?.contacts ?? null, companies: d?.companies ?? null });
      })
      .catch(() => { if (alive) setCounts({ contacts: null, companies: null }); });
    return () => { alive = false; };
  }, [silo]);
  const label = (base: string, n: number | null): string => (n == null ? base : `${base} (${n.toLocaleString()})`);
  return (
    <div style={page}>
      <div style={toggleRow}>
        <button onClick={() => setView("contacts")} style={btn(view === "contacts")}>{label("Contacts", counts.contacts)}</button>
        <button onClick={() => setView("companies")} style={btn(view === "companies")}>{label("Companies", counts.companies)}</button>
      </div>
      {view === "contacts" ? <ContactsPage /> : <CompaniesPage />}
    </div>
  );
}

const page: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
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
