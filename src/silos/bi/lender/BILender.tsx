// BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
// BF_PORTAL_BLOCK_BI_ROUND8_SIDEBAR_v1 -- Referrer added as a
// third sub-tab side-by-side with Provisioning + Apollo. Spec
// ruling 21 calls for 6 BI silo nav items (no Referrer); referrer
// management still needs a home, so it lives inside the Lender
// page. ?tab=referrer in the URL opens it directly so deep links
// from the legacy /silo/bi/referrer route (now a redirect to
// /silo/bi/lender?tab=referrer in BISilo.tsx) land correctly.
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BILenderManagement from "./BILenderManagement";
import BILenderApolloTab from "./BILenderApolloTab";
import BIReferrerManagement from "../referrer/BIReferrerManagement";

type Section = "provisioning" | "apollo" | "referrer";

function sectionFromQuery(raw: string | null): Section {
  if (raw === "apollo") return "apollo";
  if (raw === "referrer") return "referrer";
  return "provisioning";
}

export default function BILender() {
  const [params, setParams] = useSearchParams();
  const [section, setSection] = useState<Section>(() => sectionFromQuery(params.get("tab")));

  useEffect(() => {
    const next = sectionFromQuery(params.get("tab"));
    if (next !== section) setSection(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const selectSection = (next: Section) => {
    setSection(next);
    if (next === "provisioning") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    setParams(params, { replace: true });
  };

  const tabBtn = (key: Section, label: string) => (
    <button
      type="button"
      onClick={() => selectSection(key)}
      className={"px-4 py-2 rounded-md text-sm " + (section === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {tabBtn("provisioning", "Lenders")}
        {tabBtn("referrer",     "Referrers")}
        {tabBtn("apollo",       "Apollo")}
      </div>
      {section === "provisioning" && <BILenderManagement />}
      {section === "referrer"     && <BIReferrerManagement />}
      {section === "apollo"       && <BILenderApolloTab />}
    </div>
  );
}
