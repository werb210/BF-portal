// BF_NOTES_UI_v49 — drawer shell.
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import NotesEditor from "@/pages/applications/_shared/NotesEditor";

// BF_PORTAL_BLOCK_v171 — accept applicationId via prop, fall back to store.
type NotesTabProps = { applicationId?: string | null };
const NotesTab = ({ applicationId: propAppId }: NotesTabProps = {}) => {
  const storeAppId = useApplicationDrawerStore((s) => s.selectedApplicationId);
  const applicationId = propAppId ?? storeAppId;
  if (!applicationId) return <div className="drawer-placeholder">Select an application to view notes.</div>;
  return (
    <div className="drawer-tab drawer-tab__notes">
      <NotesEditor applicationId={applicationId} />
    </div>
  );
};

export default NotesTab;
