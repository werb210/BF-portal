// BF_CREDIT_SUMMARY_UI_v46 — drawer shell. Resolves applicationId from the
// drawer store and delegates to the shared editor.
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import CreditSummaryEditor from "@/pages/applications/_shared/CreditSummaryEditor";

const CreditSummaryTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  if (!applicationId) {
    return <div className="drawer-placeholder">Select an application to view credit summary.</div>;
  }
  return (
    <div className="drawer-tab drawer-tab__credit">
      <CreditSummaryEditor applicationId={applicationId} />
    </div>
  );
};

export default CreditSummaryTab;
