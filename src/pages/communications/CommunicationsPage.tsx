import { useState } from "react";
import RequireRole from "@/components/auth/RequireRole";
import Card from "@/components/ui/Card";

type CommsTab = "messages" | "sms" | "email" | "issues" | "contact-forms";

const COMMS_TABS: { id: CommsTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "issues", label: "Issue Reports" },
  { id: "contact-forms", label: "Contact Forms" },
];

const CommunicationsContent = () => {
  const [tab, setTab] = useState<CommsTab>("messages");

  return (
    <div className="page space-y-4">
      <Card title="Communications">
        <div className="flex flex-wrap gap-2 mb-4">
          {COMMS_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ui-button ${tab === item.id ? "ui-button--primary" : "ui-button--secondary"}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "messages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="drawer-section">
              <div className="drawer-section__title">Conversations</div>
              <p>Client and staff conversation list appears here.</p>
            </div>
            <div className="drawer-section md:col-span-2">
              <div className="drawer-section__title">Thread</div>
              <p>Two-way message thread with client mini-portal.</p>
              <textarea className="w-full mt-3 p-2 rounded border" placeholder="Message with #upload #networth #equipment #realestate #other" />
            </div>
          </div>
        )}

        {tab === "sms" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Twilio SMS</div>
            <p>Compose SMS and view per-contact history.</p>
            <textarea className="w-full mt-3 p-2 rounded border" placeholder="Write SMS message" />
          </div>
        )}

        {tab === "email" && (
          <div className="drawer-section space-y-3">
            <div className="drawer-section__title">Email Composer</div>
            <select className="w-full p-2 rounded border">
              <option>Personal inbox: todd@boreal.financial</option>
              <option>Shared: deals@boreal.financial</option>
            </select>
            <input className="w-full p-2 rounded border" placeholder="To" />
            <input className="w-full p-2 rounded border" placeholder="Subject" />
            <textarea className="w-full p-2 rounded border min-h-[120px]" placeholder="Body (rich text)" />
            <p className="text-sm text-slate-500">Sent and received history appears below this composer.</p>
          </div>
        )}

        {tab === "issues" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Issue Reports</div>
            <p>Client issue reports with screenshot, date, status and "Mark as resolved" actions appear here.</p>
          </div>
        )}

        {tab === "contact-forms" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Contact Forms</div>
            <p>Submissions from BF website contact form appear in this tab.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const CommunicationsPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <CommunicationsContent />
  </RequireRole>
);

export default CommunicationsPage;
