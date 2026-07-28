import { useState } from "react";
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer";
import MarketingT from "./MarketingT";

type Channel = "apollo" | "email";

export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>("apollo");

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
          {(["apollo", "email"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={channel === key}
              onClick={() => setChannel(key)}
              className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}
            >
              {key === "apollo" ? "Apollo" : "Email"}
            </button>
          ))}
        </div>
      </div>

      {channel === "apollo" ? (
        <MarketingT />
      ) : (
        <div className="max-w-7xl mx-auto px-6">
          <BrandedEmailComposer apiBase="/api/v1/bi/marketing" />
        </div>
      )}
    </div>
  );
}
