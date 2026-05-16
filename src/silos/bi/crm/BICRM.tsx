// BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- Outreach + Overview
// tabs dropped per live-test direction. BI CRM is now Contacts +
// Companies only, matching the BF CRM shape. The Outreach surface
// (sequences, mailbox health, etc.) will live in the Marketing
// module per ruling 21. The Overview aggregate view is removed
// outright; if it surfaces again later it should be a separate
// page, not a CRM tab.
import { useState } from "react";
import BIContactsList from "./contacts/BIContactsList";
import BICompaniesList from "./companies/BICompaniesList";

type TabKey = "contacts" | "companies";

export default function BICRM() {
  const [tab, setTab] = useState<TabKey>("contacts");

  const tabBtn = (k: TabKey, label: string) => (
    <button
      key={k}
      type="button"
      onClick={() => setTab(k)}
      className={
        "px-4 py-2 rounded-md text-sm " +
        (tab === k
          ? "bg-white/10 text-white"
          : "text-white/60 hover:text-white hover:bg-white/5")
      }
      aria-pressed={tab === k}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">BI CRM</h2>
        <div className="flex gap-2" role="tablist" aria-label="BI CRM tabs">
          {tabBtn("contacts", "Contacts")}
          {tabBtn("companies", "Companies")}
        </div>
      </div>

      {tab === "contacts" && <BIContactsList />}
      {tab === "companies" && <BICompaniesList />}
    </div>
  );
}
