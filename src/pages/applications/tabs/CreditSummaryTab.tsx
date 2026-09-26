// BF_CREDIT_SUMMARY_UI_v46 — route-based shell. Takes applicationId as a prop
// per BF_LENDERS_TAB_PROP_v42 to avoid coupling to the drawer store.
import { useState } from "react";
import CreditSummaryEditor from "@/pages/applications/_shared/CreditSummaryEditor";
import CreditSummaryV2 from "@/pages/applications/_shared/CreditSummaryV2";

interface Props {
  applicationId?: string;
}

export default function CreditSummaryTab({ applicationId }: Props) {
  const [previous, setPrevious] = useState(false);
  if (!applicationId) {
    return <div className="ui-empty">Select an application to view credit summary.</div>;
  }
  return (
    <div>
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <button type="button" onClick={() => setPrevious((value) => !value)}>
          {previous ? "Back to the new credit summary" : "Show previous version"}
        </button>
      </div>
      {previous ? <CreditSummaryEditor applicationId={applicationId} /> : <CreditSummaryV2 applicationId={applicationId} />}
    </div>
  );
}
