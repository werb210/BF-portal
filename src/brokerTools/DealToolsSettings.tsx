// BF_PORTAL_v867_BROKER_TOOLS - Settings > Deal tools: the set-up behind the broker tools. Each section sits behind its plan
// feature. Admins edit; staff can look.
import Gate from "./gate";
import ConditionTemplatesSettings from "./ConditionTemplatesSettings";
import SalesTaxSettings from "./SalesTaxSettings"; // BF_PORTAL_v867_BROKER_TOOLS_3_SALES_TAX
import { CreditLinesReport } from "./CreditLinesPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CREDIT_LINES
import RateCardsSettings from "./RateCardsSettings"; // BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS
import ScorecardSettings from "./ScorecardSettings"; // BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS
import ContractTemplatesSettings from "./ContractTemplatesSettings"; // BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS
import VendorsSettings from "./VendorsSettings"; // BF_PORTAL_v867_BROKER_TOOLS_VENDORS

export default function DealToolsSettings({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div data-testid="deal-tools-settings" style={{ maxWidth: 1100 }}>
      <Gate feature="funding_conditions" compact><ConditionTemplatesSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="sales_tax" compact><SalesTaxSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="rate_cards" compact><RateCardsSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_scorecards" compact><ScorecardSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="contract_templates" compact><ContractTemplatesSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_lines" compact><CreditLinesReport /></Gate>
      <Gate feature="vendor_portal" compact><VendorsSettings isAdmin={isAdmin} /></Gate>
    </div>
  );
}
