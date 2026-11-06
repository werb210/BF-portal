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
import { SectionHelp } from "./ui"; // BF_PORTAL_v909_DEAL_TOOLS_HELP

// BF_PORTAL_v909_DEAL_TOOLS_HELP - one line per section saying what it sets up.
export const DEAL_TOOLS_HELP = {
  conditions: { title: "Funding condition templates", text: "Conditions a lender or product always asks for; add them to a file in one click from its Funding tab." },
  salesTax: { title: "Sales tax", text: "GST, PST, HST and QST rates by province, used when a quote charges sales tax on a fee." },
  rateCards: { title: "Rate cards", text: "Each lender's rates by amount, term and credit, used by Structuring on the Deal desk to work out payments." },
  scorecards: { title: "Credit scorecards", text: "The points and thresholds the Deal desk scorecard uses to rate a deal before it goes to lenders." },
  contracts: { title: "Contract templates", text: "Word templates (fee agreement and others) that the Deal desk fills in from a file, ready for signature." },
  creditLines: { title: "Approved credit lines", text: "Every credit line a lender has approved for a client, with its limit and expiry, across all files." },
  vendors: { title: "Vendors", text: "Equipment and other vendors who send deals or invoices, and their portal access." },
} as const;

export default function DealToolsSettings({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div data-testid="deal-tools-settings" style={{ maxWidth: 1100 }}>
      <Gate feature="funding_conditions" compact><SectionHelp {...DEAL_TOOLS_HELP.conditions} /><ConditionTemplatesSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="sales_tax" compact><SectionHelp {...DEAL_TOOLS_HELP.salesTax} /><SalesTaxSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="rate_cards" compact><SectionHelp {...DEAL_TOOLS_HELP.rateCards} /><RateCardsSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_scorecards" compact><SectionHelp {...DEAL_TOOLS_HELP.scorecards} /><ScorecardSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="contract_templates" compact><SectionHelp {...DEAL_TOOLS_HELP.contracts} /><ContractTemplatesSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_lines" compact><SectionHelp {...DEAL_TOOLS_HELP.creditLines} /><CreditLinesReport /></Gate>
      <Gate feature="vendor_portal" compact><SectionHelp {...DEAL_TOOLS_HELP.vendors} /><VendorsSettings isAdmin={isAdmin} /></Gate>
    </div>
  );
}
