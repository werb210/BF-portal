// BF_CREDIT_SUMMARY_UI_v46 — route-based shell. Takes applicationId as a prop
// per BF_LENDERS_TAB_PROP_v42 to avoid coupling to the drawer store.
import CreditSummaryEditor from "@/pages/applications/_shared/CreditSummaryEditor";

interface Props {
  applicationId?: string;
}

export default function CreditSummaryTab({ applicationId }: Props) {
  if (!applicationId) {
    return <div className="ui-empty">Select an application to view credit summary.</div>;
  }
  return <CreditSummaryEditor applicationId={applicationId} />;
}
