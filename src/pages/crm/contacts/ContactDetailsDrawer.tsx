import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import type { Contact, Company, TimelineEvent } from "@/api/crm";
import { createNote, fetchApplications, fetchContactCompanies, fetchTimeline } from "@/api/crm";
import IncomingCallToast from "@/components/dialer/IncomingCallToast";
import SMSComposer from "@/components/sms/SMSComposer";
import EmailViewer from "@/components/email/EmailViewer";
import TimelineFeed from "@/pages/crm/timeline/TimelineFeed";
import { useDialerStore } from "@/state/dialer.store";
import { startOutboundCall } from "@/services/voiceService";

interface ContactDetailsDrawerProps {
  contact: Contact | null;
  onClose: () => void;
}

const ContactDetailsDrawer = ({ contact, onClose }: ContactDetailsDrawerProps) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<{ id: string; stage: string }[]>([]);
  const [note, setNote] = useState("");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "notes" | "emails" | "calls" | "sms" | "tasks">("all");
  const openDialer = useDialerStore((state) => state.openDialer);
  const latestLog = useDialerStore((state) => state.logs[0]);
  const lastLogId = useRef<string | null>(null);

  useEffect(() => {
    if (!contact) return;
    let isActive = true;

    fetchContactCompanies(contact).then((result) => {
      if (isActive) setCompanies(result);
    });
    fetchApplications(contact.id).then((result) => {
      if (isActive) setApplications(result);
    });
    fetchTimeline("contact", contact.id).then((result) => {
      if (isActive) setTimeline(result);
    });

    return () => {
      isActive = false;
    };
  }, [contact]);

  useEffect(() => {
    if (!contact || !latestLog) return;
    if (latestLog.contactId !== contact.id) return;
    if (lastLogId.current === latestLog.id) return;
    if (latestLog.isPending || !latestLog.outcome || !latestLog.endedAt) return;

    lastLogId.current = latestLog.id;
    fetchTimeline("contact", contact.id).then((result) => {
      setTimeline(result);
    });
  }, [contact, latestLog]);

  if (!contact) return null;

  const initials = contact.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAddNote = async () => {
    if (!note.trim()) return;
    const created = await createNote(contact.id, note.trim());
    setTimeline((current) => [created, ...current]);
    setNote("");
    setShowNoteEditor(false);
  };

  const leadStatus = (contact as Contact & { lead_status?: string | null }).lead_status ?? "New";
  const createdAt = (contact as Contact & { created_at?: string | null }).created_at;

  const filteredTimeline = timeline.filter((item) => {
    if (activeFilter === "all") return true;
    const eventType = (item.type ?? "").toLowerCase();
    if (activeFilter === "notes") return eventType.includes("note");
    if (activeFilter === "emails") return eventType.includes("email");
    if (activeFilter === "calls") return eventType.includes("call");
    if (activeFilter === "sms") return eventType.includes("sms");
    if (activeFilter === "tasks") return eventType.includes("task");
    return true;
  });

  return (
    <aside className="drawer" data-testid="contact-drawer">
      <div className="drawer__header">
        <h3>{contact.name}</h3>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      <div className="drawer__content" style={{ display: "flex", flexDirection: "row", height: "100%", overflow: "hidden", gap: 0 }}>
        <section style={{ width: 280, minWidth: 280, borderRight: "1px solid #e2e8f0", overflowY: "auto", padding: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            {initials}
          </div>
          <h2 style={{ margin: 0, fontSize: 22 }}>{contact.name}</h2>
          <p style={{ margin: "4px 0", color: "#475569" }}>{(contact as Contact & { job_title?: string }).job_title ?? "—"}</p>
          <a href="#" onClick={(e) => e.preventDefault()}>{companies[0]?.name ?? (contact as Contact & { company_name?: string }).company_name ?? "—"}</a>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            <Button onClick={() => {
              void startOutboundCall(contact.id);
              openDialer({ contactId: contact.id, contactName: contact.name, applicationId: (contact.applicationIds ?? [])[0], phone: contact.phone, source: "crm" });
            }}>Call</Button>
            <Button onClick={() => navigate(`/communications?tab=sms&contact_id=${contact.id}`)}>SMS</Button>
            <Button onClick={() => setShowEmail(true)}>Email</Button>
            <Button variant="secondary" onClick={() => setShowNoteEditor((prev) => !prev)}>Note</Button>
            <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent("crm:task", { detail: { contactId: contact.id } }))}>Task</Button>
          </div>

          {showNoteEditor && (
            <div style={{ marginTop: 10 }}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note" className="drawer-input" />
              <Button onClick={handleAddNote} className="mt-2">Save Note</Button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>About this contact</h4>
            <p>Email: {contact.email || "—"}</p>
            <p>Phone: {contact.phone || "—"}</p>
            <p>
              Lead status: <span className="status-pill">{leadStatus}</span>
            </p>
            <p>Owner: {contact.owner || "—"}</p>
            <p>Created: {createdAt ? new Date(createdAt).toLocaleDateString("en-CA") : "—"}</p>
            <p>Tags: {(contact.tags ?? []).join(", ") || "—"}</p>
          </div>

          {applications.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ marginBottom: 8 }}>Applications</h4>
              {applications.map((app) => (
                <div key={app.id} style={{ padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 6 }}>
                  <strong>{app.id}</strong> — {app.stage}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Activity Timeline</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["all", "notes", "emails", "calls", "sms", "tasks"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 999,
                    padding: "4px 10px",
                    background: activeFilter === filter ? "#dbeafe" : "#fff",
                    color: activeFilter === filter ? "#1d4ed8" : "#475569",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <TimelineFeed entityId={contact.id} entityType="contact" initialEvents={filteredTimeline} />
        </section>
      </div>

      {incoming && (
        <IncomingCallToast
          from={incoming}
          onAccept={() => {
            setIncoming(null);
            openDialer({
              contactId: contact.id,
              contactName: contact.name,
              applicationId: (contact.applicationIds ?? [])[0],
              phone: contact.phone,
              source: "crm"
            });
          }}
          onViewRecord={() => undefined}
          onDismiss={() => setIncoming(null)}
        />
      )}
      <SMSComposer visible={showSms} contact={contact} onClose={() => setShowSms(false)} />
      <EmailViewer visible={showEmail} contactId={contact.id} onClose={() => setShowEmail(false)} />
    </aside>
  );
};

export default ContactDetailsDrawer;
