// BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
import { useState } from "react";
import BILenderManagement from "./BILenderManagement";
import BILenderApolloTab from "./BILenderApolloTab";

type Section = "provisioning" | "apollo";

export default function BILender() {
  const [section, setSection] = useState<Section>("provisioning");
  return (
    <div>
      <div className="flex gap-3 mb-6">
        <button type="button" onClick={() => setSection("provisioning")} className={"px-4 py-2 rounded-md text-sm " + (section === "provisioning" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>
          Provisioning
        </button>
        <button type="button" onClick={() => setSection("apollo")} className={"px-4 py-2 rounded-md text-sm " + (section === "apollo" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>
          Apollo
        </button>
      </div>
      {section === "provisioning" && <BILenderManagement />}
      {section === "apollo" && <BILenderApolloTab />}
    </div>
  );
}
