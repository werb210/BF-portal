import { useState } from "react"
import ApplicationDetail from "./ApplicationDetail"

type ApplicationCardProps = {
  card: {
    id: string
    company: string
    amount: string
  }
}

export default function ApplicationCard({ card }: ApplicationCardProps) {
  const [tab, setTab] = useState<"application" | "documents" | "notes">("application")
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        style={{
          background: "#1e293b",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "10px"
        }}
      >
        <strong onClick={() => setOpen(true)} style={{ cursor: "pointer" }}>
          {card.company}
        </strong>

        <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
          <button onClick={() => setTab("application")}>Application</button>
          <button onClick={() => setTab("documents")}>Documents</button>
          <button onClick={() => setTab("notes")}>Notes</button>
        </div>

        <div style={{ marginTop: "10px" }}>
          {tab === "application" && <div>Amount: {card.amount}</div>}

          {tab === "documents" && <div>No documents uploaded</div>}

          {tab === "notes" && <div>No notes yet</div>}
        </div>
      </div>
      {open && <ApplicationDetail id={card.id} onClose={() => setOpen(false)} />}
    </>
  )
}
