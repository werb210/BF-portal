import { useState } from "react";
import LinkClicksPanel from "@/components/marketing/LinkClicksPanel"; // BF_PORTAL_LINK_CLICKS_PANEL_v9
import FlowsTab from "./tabs/FlowsTab"; // BF_PORTAL_BI_EMAIL_FLOWS_v1
import SharedContactsPanel from "@/pages/marketing/SharedContactsPanel"; // BF_PORTAL_SHARED_CONTACTS_v1
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer"; // BF_PORTAL_EMAIL_TAB_BACK_v1

// BF_PORTAL_CRM_FLOWS_v1 - Flows are the one way to email a list. The old one-off Email blast and the Sequences
// builder are retired (they could email the same people twice alongside a flow). Flows open first.
// BF_PORTAL_EMAIL_TAB_BACK_v1 - the one-off email creator is back beside Flows.
type Channel = "flows" | "email" | "links" | "contacts";
const LABEL: Record<Channel, string> = { flows: "Flows", email: "Email", links: "Links", contacts: "Contacts" };

export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>("flows");
  return <div className="space-y-6">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
        {(Object.keys(LABEL) as Channel[]).map((key) => <button key={key} type="button" role="tab" aria-selected={channel === key} onClick={() => setChannel(key)} className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>{LABEL[key]}</button>)}
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6">
      {channel === "flows" ? <FlowsTab /> : channel === "email" ? <BrandedEmailComposer apiBase="/api/v1/bi/marketing" /> : channel === "links" ? <LinkClicksPanel apiBase="/api/v1/bi/marketing" /> : <SharedContactsPanel />}
    </div>
  </div>;
}
