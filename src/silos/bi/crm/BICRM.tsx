// BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- Outreach + Overview
// tabs dropped per live-test direction. BI CRM is now Contacts +
// Companies only, matching the BF CRM shape. The Outreach surface
// (sequences, mailbox health, etc.) will live in the Marketing
// module per ruling 21. The Overview aggregate view is removed
// outright; if it surfaces again later it should be a separate
// page, not a CRM tab.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, apiGetEnvelope } from "@/api";
import { btn, toggleRow } from "@/pages/crm/CrmListPage"; // BF_PORTAL_v914_BI_CRM_PARITY
import BIContactsList from "./contacts/BIContactsList";
import BICompaniesList from "./companies/BICompaniesList";
import { BI_CRM_BACKEND } from "@/components/crm/unified/crmUnifiedApi"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmDuplicatesPage } from "@/components/crm/unified/CrmDuplicates"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmCleanupPage } from "@/components/crm/unified/CrmCleanupPage"; // BF_PORTAL_v856_CRM_UNIFY

type TabKey = "contacts" | "companies" | "duplicates" | "cleanup"; // BF_PORTAL_v856_CRM_UNIFY

export default function BICRM() {
  // BF_PORTAL_BLOCK_v854_BI_CRM_TAB_URL — keep the active tab in the URL so a
  // company/contact card "Back" link can return to the tab the user came from.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab"); // BF_PORTAL_v856_CRM_UNIFY
  const tab: TabKey = rawTab === "companies" || rawTab === "duplicates" || rawTab === "cleanup" ? rawTab : "contacts";
  const setTab = (k: TabKey) => setSearchParams((p) => { p.set("tab", k); return p; }, { replace: true });

  // BF_PORTAL_v914_BI_CRM_PARITY - same tab row as the Financial CRM, with live counts.
  const [counts, setCounts] = useState<{ contacts: number | null; companies: number | null }>({ contacts: null, companies: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      const one = async (path: string) => { try { const r: any = await apiGetEnvelope(`${path}?page=1&pageSize=1`) /* BF_PORTAL_v921_BI_TOTALS - envelope keeps the real total */; return Number.isFinite(Number(r?.total)) ? Number(r.total) : null; } catch (err) { console.warn("[bi-crm] count failed", path, err); return null; } };
      const [c, co] = await Promise.all([one("/api/v1/bi/crm/contacts"), one("/api/v1/bi/crm/companies")]);
      if (alive) setCounts({ contacts: c, companies: co });
    })();
    return () => { alive = false; };
  }, []);
  const label = (base: string, n: number | null) => (n == null ? base : `${base} (${n.toLocaleString()})`);
  const tabBtn = (k: TabKey, text: string) => (
    <button key={k} type="button" onClick={() => setTab(k)} style={btn(tab === k)} aria-pressed={tab === k}>{text}</button>
  );

  return (
    <div style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>
      <div style={toggleRow} role="tablist" aria-label="Insurance CRM tabs">
        {tabBtn("contacts", label("Contacts", counts.contacts))}
        {tabBtn("companies", label("Companies", counts.companies))}
        {tabBtn("duplicates", "Find duplicates")}
        {tabBtn("cleanup", "Clean up data")}
      </div>

      {tab === "contacts" && <BIContactsList onUnfilteredTotal={(n) => setCounts((p) => ({ ...p, contacts: n }))} />}
      {tab === "companies" && <BICompaniesList onUnfilteredTotal={(n) => setCounts((p) => ({ ...p, companies: n }))} />}
      {tab === "duplicates" && <CrmDuplicatesPage backend={BI_CRM_BACKEND} />}
      {tab === "cleanup" && <CrmCleanupPage backend={BI_CRM_BACKEND} />}
    </div>
  );
}
