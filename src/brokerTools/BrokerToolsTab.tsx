// BF_PORTAL_v865_BROKER_TOOLS - the broker tools tabs on an application (Boreal has no plans: every panel is on).
import FundingConditionsPanel from "./FundingConditionsPanel";

export const BROKER_TOOL_TABS = [
  { key: "funding", label: "Funding" },
] as const;

export type BrokerToolTab = (typeof BROKER_TOOL_TABS)[number]["key"];

export default function BrokerToolsTab({ tab, applicationId }: { tab: BrokerToolTab; applicationId: string; application?: Record<string, any> | null }) {
  if (tab === "funding") return <FundingConditionsPanel applicationId={applicationId} />;
  return null;
}
