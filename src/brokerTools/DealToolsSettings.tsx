// BF_PORTAL_v867_BROKER_TOOLS - Settings > Deal tools: the set-up behind the broker tools. Each section sits behind its plan
// feature. Admins edit; staff can look.
import Gate from "./gate";
import ConditionTemplatesSettings from "./ConditionTemplatesSettings";
import SalesTaxSettings from "./SalesTaxSettings"; // BF_PORTAL_v867_BROKER_TOOLS_3_SALES_TAX
import RateCardsSettings from "./RateCardsSettings"; // BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS
import VendorsSettings from "./VendorsSettings"; // BF_PORTAL_v867_BROKER_TOOLS_VENDORS
import { SectionHelp } from "./ui"; // BF_PORTAL_v909_DEAL_TOOLS_HELP

// BF_PORTAL_v909_DEAL_TOOLS_HELP - one line per section saying what it sets up.
// BF_PORTAL_v938_CARD_REDESIGN - scorecards, contract templates and credit lines removed with the Deal desk.
export const DEAL_TOOLS_HELP = {
  conditions: { title: "Funding condition templates", text: "Conditions a lender or product always asks for; add them to a file in one click from its Lenders > Offer tab." },
  salesTax: { title: "Sales tax", text: "GST, PST, HST and QST rates by province, used when a fee is taxed." },
  rateCards: { title: "Rate cards", text: "Each lender's rates by amount, term and credit, used by the vendor portal to quote payments at the point of sale." },
  vendors: { title: "Vendors", text: "Equipment and other vendors who send deals or invoices, and their portal access." },
} as const;

export default function DealToolsSettings({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div data-testid="deal-tools-settings" style={{ maxWidth: 1100 }}>
      <Gate feature="funding_conditions" compact><SectionHelp {...DEAL_TOOLS_HELP.conditions} /><ConditionTemplatesSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="sales_tax" compact><SectionHelp {...DEAL_TOOLS_HELP.salesTax} /><SalesTaxSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="rate_cards" compact><SectionHelp {...DEAL_TOOLS_HELP.rateCards} /><RateCardsSettings isAdmin={isAdmin} /></Gate>
      <Gate feature="vendor_portal" compact><SectionHelp {...DEAL_TOOLS_HELP.vendors} /><VendorsSettings isAdmin={isAdmin} /></Gate>
    </div>
  );
}
