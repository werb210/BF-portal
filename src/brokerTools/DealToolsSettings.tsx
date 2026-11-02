// BF_PORTAL_v865_BROKER_TOOLS - Settings > Deal tools: the set-up behind the broker tools. Admins edit; staff can look.
import ConditionTemplatesSettings from "./ConditionTemplatesSettings";
import SalesTaxSettings from "./SalesTaxSettings";

export default function DealToolsSettings({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div data-testid="deal-tools-settings" style={{ maxWidth: 1100 }}>
      <ConditionTemplatesSettings isAdmin={isAdmin} />
      <SalesTaxSettings isAdmin={isAdmin} />
    </div>
  );
}
