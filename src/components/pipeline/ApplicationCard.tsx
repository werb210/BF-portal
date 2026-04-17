import { useState } from "react";
import ApplicationDetail from "./ApplicationDetail";

type ApplicationCardProps = {
  card: {
    id: string;
    company: string;
    amount: string;
  };
};

export default function ApplicationCard({ card }: ApplicationCardProps) {
  const [tab, setTab] = useState<"application" | "documents" | "notes">("application");
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="pipeline-stage-card">
        <strong onClick={() => setOpen(true)} style={{ cursor: "pointer" }}>
          {card.company}
        </strong>

        <div className="pipeline-stage-card__tabs">
          <button className="ui-button ui-button--secondary" onClick={() => setTab("application")}>Application</button>
          <button className="ui-button ui-button--secondary" onClick={() => setTab("documents")}>Documents</button>
          <button className="ui-button ui-button--secondary" onClick={() => setTab("notes")}>Notes</button>
        </div>

        <div className="pipeline-stage-card__body">
          {tab === "application" && <div>Amount: {card.amount || "Pending"}</div>}
          {tab === "documents" && <div>No documents uploaded</div>}
          {tab === "notes" && <div>No notes yet</div>}
        </div>
      </article>
      {open && <ApplicationDetail id={card.id} onClose={() => setOpen(false)} />}
    </>
  );
}
