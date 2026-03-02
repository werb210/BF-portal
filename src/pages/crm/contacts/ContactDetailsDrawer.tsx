import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Contact, Company, TimelineEvent } from "@/api/crm";
import { createNote, fetchApplications, fetchContactCompanies, fetchTimeline } from "@/api/crm";
import IncomingCallToast from "@/components/dialer/IncomingCallToast";
import SMSComposer from "@/components/sms/SMSComposer";
import EmailViewer from "@/components/email/EmailViewer";
import TimelineFeed from "@/pages/crm/timeline/TimelineFeed";
import { useDialerStore } from "@/state/dialer.store";
import { startOutboundCall } from "@/services/voiceService";
import CreditReadinessPanel from "@/components/crm/CreditReadinessPanel";
import { VoicemailList } from "@/components/VoicemailList";

interface ContactDetailsDrawerProps {
  contact: Contact | null;
  onClose: () => void;
}

const ContactDetailsDrawer = ({ contact, onClose }: ContactDetailsDrawerProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<{ id: string; stage: string }[]>([]);
  const [note, setNote] = useState("");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "readiness">("overview");
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
    const endedAt = latestLog.endedAt;
    const outcome = latestLog.outcome;
    if (latestLog.isPending || !outcome || !endedAt) return;
    lastLogId.current = latestLog.id;
    setTimeline((current) => [
      {
        id: latestLog.id,
        entityId: contact.id,
        entityType: "contact",
        type: "call",
        direction: "outbound",
        occurredAt: endedAt,
        summary: `Outbound call to ${latestLog.number || "unknown number"}`,
        details: `Duration ${latestLog.durationSeconds}s · Outcome ${latestLog.outcome}${
          latestLog.failureReason ? ` · Reason ${latestLog.failureReason}` : ""
        }`,
        call: {
          outcome,
          durationSeconds: latestLog.durationSeconds,
          failureReason: latestLog.failureReason ?? null,
          recordingUrl: latestLog.recordingUrl ?? null
        }
      },
      ...current
    ]);
  }, [contact, latestLog]);

  if (!contact) return null;

  const handleAddNote = async () => {
    if (!note) return;
    const created = await createNote(contact.id, note);
    setTimeline((current) => [created, ...current]);
    setNote("");
  };

  return (
    <aside className="drawer" data-testid="contact-drawer">
      <div className="drawer__header">
        <h3>{contact.name}</h3>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="drawer__content">
        <div className="mb-4 flex gap-2">
          <Button variant={activeTab === "overview" ? "primary" : "secondary"} onClick={() => setActiveTab("overview")}>
            Overview
          </Button>
          <Button variant={activeTab === "readiness" ? "primary" : "secondary"} onClick={() => setActiveTab("readiness")}>
            Credit Readiness
          </Button>
        </div>
        {activeTab === "readiness" ? <CreditReadinessPanel contactId={contact.id} /> : null}
        {activeTab === "overview" ? (
          <>
        <Card title="Basic Info">
          <div className="mb-2 flex items-center gap-2">
            {contact.source === "ai" && (
              <span className="rounded bg-black px-2 py-1 text-xs text-white">
                AI Lead
              </span>
            )}
            {contact.source === "credit_readiness" && (
              <span className="rounded bg-gray-200 px-2 py-1 text-xs">
                Credit Readiness
              </span>
            )}
            {contact.tags?.includes("startup_interest") && (
              <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                Startup Interest
              </span>
            )}
          </div>
          <p>Email: {contact.email}</p>
          <p>Phone: {contact.phone}</p>
          <p>Silo: {contact.silo}</p>
          <p>Owner: {contact.owner}</p>
          <p>Tags: {contact.tags.join(", ")}</p>
          {contact.tags.includes("startup_interest") ? (
            <p>Startup Interest: Yes</p>
          ) : null}
          {contact.referrerName ? <p>Referred by: {contact.referrerName}</p> : null}
        </Card>
        <Card title="Associated Companies">
          {companies.map((company) => (
            <div key={company.id}>{company.name}</div>
          ))}
        </Card>
        <Card title="Linked Applications">
          {applications.map((app) => (
            <div key={app.id}>{app.id} — {app.stage}</div>
          ))}
        </Card>
        <div className="flex gap-2 my-2">
          <Button
            onClick={() => {
              void startOutboundCall(contact.id);

              openDialer({
                contactId: contact.id,
                contactName: contact.name,
                applicationId: contact.applicationIds[0],
                phone: contact.phone,
                source: "crm"
              });
            }}
          >
            Call
          </Button>
          <Button onClick={() => setShowSms(true)}>SMS</Button>
          <Button onClick={() => setShowEmail(true)}>Email</Button>
          <Button variant="secondary" onClick={() => setIncoming(contact.phone)}>
            Simulate Incoming
          </Button>
        </div>
        <Card title="Add Note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add internal note"
            className="drawer-input"
          />
          <Button onClick={handleAddNote} className="mt-2">
            Save Note
          </Button>
        </Card>
        <Card title="Voicemails">
          <VoicemailList clientId={contact.id} />
        </Card>
        <Card title="CRM Timeline">
          <TimelineFeed entityId={contact.id} entityType="contact" initialEvents={timeline} />
        </Card>
          </>
        ) : null}
      </div>
      {incoming && (
        <IncomingCallToast
          from={incoming}
          onAccept={() => {
            setIncoming(null);
            openDialer({
              contactId: contact.id,
              contactName: contact.name,
              applicationId: contact.applicationIds[0],
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
