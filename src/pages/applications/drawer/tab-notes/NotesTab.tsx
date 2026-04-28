// BF_NOTES_UI_v49 — drawer shell.
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import NotesEditor from "@/pages/applications/_shared/NotesEditor";

const NotesTab = () => {
  const applicationId = useApplicationDrawerStore((s) => s.selectedApplicationId);
  if (!applicationId) return <div className="drawer-placeholder">Select an application to view notes.</div>;
  return (
    <div className="drawer-tab drawer-tab__notes">
      <NotesEditor applicationId={applicationId} />
    </div>
  );
};

export default NotesTab;
