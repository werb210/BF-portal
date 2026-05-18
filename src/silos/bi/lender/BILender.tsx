// BF_PORTAL_BLOCK_84_LENDER_REFERRER_SUBTABS_v3
// Lender page is a tabbed container: Lenders | Referrers.
// Test AppLayout.bisilo.test.tsx:110 locks in that the BI sidebar
// has exactly 6 items and Referrer is NOT one of them. This is the
// canonical location for Referrer access. The /silo/bi/referrer
// direct-URL route stays defined in BISilo.tsx for back-compat.
// Tab state lives in ?tab so deep links work.
import { useSearchParams } from "react-router-dom";
import BILenderManagement from "./BILenderManagement";
import BIReferrerManagement from "../referrer/BIReferrerManagement";

type LenderSubTab = "lenders" | "referrers";

export default function BILender() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: LenderSubTab = raw === "referrers" ? "referrers" : "lenders";

  function setTab(next: LenderSubTab) {
    const sp = new URLSearchParams(searchParams);
    if (next === "lenders") sp.delete("tab");
    else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  }

  const tabs: ReadonlyArray<{ key: LenderSubTab; label: string }> = [
    { key: "lenders", label: "Lenders" },
    { key: "referrers", label: "Referrers" },
  ];

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-white/10" role="tablist" aria-label="Lender sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition ${
              tab === t.key
                ? "border-b-2 border-blue-400 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "lenders" ? <BILenderManagement /> : <BIReferrerManagement />}
    </div>
  );
}
