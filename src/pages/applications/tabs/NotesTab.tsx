// BF_NOTES_UI_v49 — detail-page shell. Prop-driven per BF_LENDERS_TAB_PROP_v42.
import NotesEditor from "@/pages/applications/_shared/NotesEditor";

interface Props { applicationId?: string }

export default function NotesTab({ applicationId }: Props) {
  if (!applicationId) return <div className="ui-empty">Select an application to view notes.</div>;
  return <NotesEditor applicationId={applicationId} />;
}
