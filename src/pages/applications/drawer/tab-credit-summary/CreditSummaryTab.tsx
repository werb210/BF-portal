// BF_CREDIT_SUMMARY_UI_v46 — drawer shell. Resolves applicationId from the
// drawer store and delegates to the shared editor.
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import CreditSummaryEditor from "@/pages/applications/_shared/CreditSummaryEditor";

// BF_PORTAL_BLOCK_v171 — accept applicationId via prop, fall back to store.
type CreditSummaryTabProps = { applicationId?: string | null };
const CreditSummaryTab = ({ applicationId: propAppId }: CreditSummaryTabProps = {}) => {
  const storeAppId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const applicationId = propAppId ?? storeAppId;
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
