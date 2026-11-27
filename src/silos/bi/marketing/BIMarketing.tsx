import { useState } from "react";
import LinkClicksPanel from "@/components/marketing/LinkClicksPanel"; // BF_PORTAL_LINK_CLICKS_PANEL_v9
import FlowsTab from "./tabs/FlowsTab"; // BF_PORTAL_BI_EMAIL_FLOWS_v1
import SharedContactsPanel from "@/pages/marketing/SharedContactsPanel"; // BF_PORTAL_SHARED_CONTACTS_v1
import BrandedEmailComposer from "@/components/marketing/BrandedEmailComposer"; // BF_PORTAL_EMAIL_TAB_BACK_v1
import OutreachPanel, { PGI_OUTREACH } from "@/components/marketing/OutreachPanel"; // BF_PORTAL_OUTREACH_TRACKING_v1

// BF_PORTAL_CRM_FLOWS_v1 - Flows are the one way to email a list. The old one-off Email blast and the Sequences
// builder are retired (they could email the same people twice alongside a flow). Flows open first.
// BF_PORTAL_EMAIL_TAB_BACK_v1 - the one-off email creator is back beside Flows.
// BF_PORTAL_OUTREACH_TRACKING_v1 - Outreach: who replied, booked or clicked and is waiting for a follow-up.
type Channel = "outreach" | "flows" | "email" | "links" | "contacts";
const LABEL: Record<Channel, string> = { outreach: "Outreach", flows: "Flows", email: "Email", links: "Links", contacts: "Contacts" };
// BF_PORTAL_BI_MARKETING_OUTREACH_FIRST_v1 - Todd: Marketing opens on Outreach; ?tab= picks another channel.
const initialChannel = (): Channel => {
  const t = new URLSearchParams(window.location.search).get("tab") as Channel | null;
  return t && t in LABEL ? t : "outreach";
};

export default function BIMarketing() {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  return <div className="space-y-6">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-2" role="tablist" aria-label="Marketing channels">
        {(Object.keys(LABEL) as Channel[]).map((key) => <button key={key} type="button" role="tab" aria-selected={channel === key} onClick={() => setChannel(key)} className={"px-4 py-2 rounded-md text-sm font-medium " + (channel === key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>{LABEL[key]}</button>)}
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6">
      {channel === "outreach" ? <OutreachPanel backend={PGI_OUTREACH} /> : channel === "flows" ? <FlowsTab /> : channel === "email" ? <BrandedEmailComposer apiBase="/api/v1/bi/marketing" /> : channel === "links" ? <LinkClicksPanel apiBase="/api/v1/bi/marketing" /> : <SharedContactsPanel />}
    </div>
  </div>;
}
