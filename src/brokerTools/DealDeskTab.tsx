// BF_PORTAL_v867_BROKER_TOOLS_2 - the application's Deal desk tab: the broker tools that work on one deal, each behind its plan
// feature.
// BF_PORTAL_v906_DEAL_DESK_HELP - an introduction and one line per section, so staff know what each tool is for.
// Nothing moved or removed.
import Gate from "./gate";
import { useIsAdminRole } from "./role";
import InvoicesPanel from "./InvoicesPanel"; // BF_PORTAL_v867_BROKER_TOOLS_INVOICES
import CreditLinesPanel from "./CreditLinesPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CREDIT_LINES
import StructuringPanel from "./StructuringPanel"; // BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS
import ScorecardPanel from "./ScorecardPanel"; // BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS
import ContractsPanel from "./ContractsPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS
import CreditBureauPanel from "./CreditBureauPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CREDIT_BUREAU
import { card, muted, SectionHelp } from "./ui";

export const DEAL_DESK_HELP = {
  invoices: { title: "Vendor invoices", text: "Read an equipment or vendor invoice (who is selling, what, and for how much) so the deal and the lender package use the real figures." },
  bureau: { title: "Credit bureau", text: "Pull or record the business and owner credit reports for this file. Admins choose which bureau is used in Settings > Deal tools." },
  scorecard: { title: "Credit scorecard", text: "Score the deal against your scorecard (time in business, revenue, credit, debt load) to see quickly how strong it is before sending it to lenders." },
  structuring: { title: "Structuring", text: "Try amounts, terms and rates from your rate cards to find a payment the business can afford, before you quote it." },
  contracts: { title: "Contracts", text: "Make this deal's documents (for example a fee agreement) from your contract templates, filled in from the file, ready to send for signature." },
  creditLines: { title: "Approved credit lines", text: "Record a credit line a lender approved for this client (limit, lender, expiry) so the next deal can draw on it." },
} as const;

export default function DealDeskTab({ applicationId }: { applicationId: string }) {
  const isAdmin = useIsAdminRole();
  return (
    <div data-testid="deal-desk" style={{ maxWidth: 1200 }}>
      <section style={card} data-testid="deal-desk-intro">
        <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--ui-text)" }}>Deal desk</h3>
        <p style={muted}>
          The tools for working one deal before it goes to lenders: check credit, score and structure the deal, read vendor invoices, and prepare its
          contracts. Each section says what it does. Results stay on this file; nothing is sent to the client or a lender from here unless you send it.
        </p>
      </section>
      <Gate feature="invoice_reading"><SectionHelp {...DEAL_DESK_HELP.invoices} /><InvoicesPanel applicationId={applicationId} /></Gate>
      <Gate feature="credit_bureau"><SectionHelp {...DEAL_DESK_HELP.bureau} /><CreditBureauPanel applicationId={applicationId} isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_scorecards"><SectionHelp {...DEAL_DESK_HELP.scorecard} /><ScorecardPanel applicationId={applicationId} /></Gate>
      <Gate feature="rate_cards"><SectionHelp {...DEAL_DESK_HELP.structuring} /><StructuringPanel applicationId={applicationId} /></Gate>
      <Gate feature="contract_templates"><SectionHelp {...DEAL_DESK_HELP.contracts} /><ContractsPanel applicationId={applicationId} /></Gate>
      <Gate feature="credit_lines"><SectionHelp {...DEAL_DESK_HELP.creditLines} /><CreditLinesPanel applicationId={applicationId} /></Gate>
    </div>
  );
}
