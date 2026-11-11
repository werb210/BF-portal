// BF_NOTES_UI_v49 — detail-page shell. Prop-driven per BF_LENDERS_TAB_PROP_v42.
// BF_PORTAL_v938_CARD_REDESIGN - the questions for the lender (Lender Q&A) sit beside the notes.
import NotesEditor from "@/pages/applications/_shared/NotesEditor";
import LenderQaSection from "@/pages/applications/tabs/LenderQaSection";

interface Props { applicationId?: string }

export default function NotesTab({ applicationId }: Props) {
  if (!applicationId) return <div className="ui-empty">Select an application to view notes.</div>;
  return (
    <div data-testid="notes-and-lender-questions" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, alignItems: "start" }}>
      <div><NotesEditor applicationId={applicationId} /></div>
      <div><LenderQaSection applicationId={applicationId} /></div>
    </div>
  );
}
