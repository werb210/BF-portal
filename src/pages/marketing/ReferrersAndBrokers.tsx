// BF_PORTAL_PARTNERS_TABS_v720 - Marketing > Referrers holds both kinds of partner:
// "Referrers" (the existing referrer management) and "Brokers" (partner-broker
// files, moved here from Settings > Broker Files).
import { useState } from "react";
import BFReferrerManagement from "./BFReferrerManagement";
import BrokerImportsPage from "@/pages/brokerImports/BrokerImportsPage";

type Sub = "referrers" | "brokers";
const SUBS: Array<[Sub, string]> = [["referrers", "Referrers"], ["brokers", "Brokers"]];

export default function ReferrersAndBrokers({ initial = "referrers" }: { initial?: Sub }) {
  const [sub, setSub] = useState<Sub>(initial);
  return (
    <div className="space-y-4">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="tablist" aria-label="Partners">
        {SUBS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={sub === id} className={`ui-button ${sub === id ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>
      {sub === "referrers" ? <BFReferrerManagement /> : <BrokerImportsPage />}
    </div>
  );
}
