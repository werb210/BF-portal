// BF_PORTAL_BLOCK_BI_LENDER_PRODUCTS_TAB_v1
// Round 5 design notes 4 + 5: BI Lender section is provisioning-only
// (legacy tab stripped). Adds a Lender Products sub-tab so the BI silo
// mirrors BF silo's Lenders + Lender Products side-by-side pattern.
// The legacy lender tab is no longer mounted from here but kept on disk so
// it can be reused if that work returns under a different surface.
import { useState } from "react";
import BILenderManagement from "./BILenderManagement";
import BILenderProducts from "./BILenderProducts";

type Section = "provisioning" | "products";

export default function BILender() {
  const [section, setSection] = useState<Section>("provisioning");
  return (
    <div>
      <div className="flex gap-3 mb-6">
        <button type="button" onClick={() => setSection("provisioning")} className={"px-4 py-2 rounded-md text-sm " + (section === "provisioning" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>
          Lenders
        </button>
        <button type="button" onClick={() => setSection("products")} className={"px-4 py-2 rounded-md text-sm " + (section === "products" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>
          Lender Products
        </button>
      </div>
      {section === "provisioning" && <BILenderManagement />}
      {section === "products" && <BILenderProducts />}
    </div>
  );
}
