// BF_PORTAL_v867_BROKER_TOOLS_2 - the application's Deal desk tab: the broker tools that work on one deal, each behind its plan
// feature.
import Gate from "./gate";
import { useIsAdminRole } from "./role";
import InvoicesPanel from "./InvoicesPanel"; // BF_PORTAL_v867_BROKER_TOOLS_INVOICES
import CreditLinesPanel from "./CreditLinesPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CREDIT_LINES
import StructuringPanel from "./StructuringPanel"; // BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS
import ScorecardPanel from "./ScorecardPanel"; // BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS
import ContractsPanel from "./ContractsPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS
import CreditBureauPanel from "./CreditBureauPanel"; // BF_PORTAL_v867_BROKER_TOOLS_CREDIT_BUREAU

export default function DealDeskTab({ applicationId }: { applicationId: string }) {
  const isAdmin = useIsAdminRole();
  return (
    <div data-testid="deal-desk" style={{ maxWidth: 1200 }}>
      <Gate feature="invoice_reading"><InvoicesPanel applicationId={applicationId} /></Gate>
      <Gate feature="credit_bureau"><CreditBureauPanel applicationId={applicationId} isAdmin={isAdmin} /></Gate>
      <Gate feature="credit_scorecards"><ScorecardPanel applicationId={applicationId} /></Gate>
      <Gate feature="rate_cards"><StructuringPanel applicationId={applicationId} /></Gate>
      <Gate feature="contract_templates"><ContractsPanel applicationId={applicationId} /></Gate>
      <Gate feature="credit_lines"><CreditLinesPanel applicationId={applicationId} /></Gate>
    </div>
  );
}
