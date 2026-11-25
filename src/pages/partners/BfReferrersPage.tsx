// BF_PORTAL_SAME_MENU_v1 - Boreal Financial referrers and brokers under Partners (they were a Marketing tab).
import PartnersTabs, { BF_PARTNER_TABS } from "./PartnersTabs";
import ReferrersAndBrokers from "@/pages/marketing/ReferrersAndBrokers";

export default function BfReferrersPage() {
  const sub = new URLSearchParams(window.location.search).get("sub") === "brokers" ? "brokers" : "referrers";
  return (
    <div>
      <PartnersTabs tabs={BF_PARTNER_TABS} />
      <div style={{ padding: 16 }}><ReferrersAndBrokers initial={sub} /></div>
    </div>
  );
}
