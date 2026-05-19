import { useState } from "react";
import MarketingA from "./MarketingA";
import MarketingT from "./MarketingT";

type MarketingTab = "marketing-a" | "marketing-t";

export default function BIMarketing() {
  const [tab, setTab] = useState<MarketingTab>("marketing-a");

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">BI Marketing</h2>
        <div className="flex gap-2" role="tablist" aria-label="BI marketing variants">
          <button
            type="button"
            onClick={() => setTab("marketing-a")}
            aria-pressed={tab === "marketing-a"}
            className={"px-3 py-1.5 rounded-md text-sm " + (tab === "marketing-a" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}
          >
            Marketing-A
          </button>
          <button
            type="button"
            onClick={() => setTab("marketing-t")}
            aria-pressed={tab === "marketing-t"}
            className={"px-3 py-1.5 rounded-md text-sm " + (tab === "marketing-t" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}
          >
            Marketing-T
          </button>
        </div>
      </div>

      {tab === "marketing-a" ? <MarketingA /> : <MarketingT />}
    </div>
  );
}
