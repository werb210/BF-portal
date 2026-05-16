// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
// Replaces the v204 Apollo dashboard. The Apollo per-contact view
// still lives on the BI contact detail drawer via apolloMarketing.ts;
// this surface is the campaign-level module backed by the Block 34/35
// /api/v1/bi/marketing/* endpoints.
import { useState } from "react";
import SequencesTab from "./tabs/SequencesTab";
import EnrollmentsTab from "./tabs/EnrollmentsTab";
import SuppressionsTab from "./tabs/SuppressionsTab";
import ListsTab from "./tabs/ListsTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import MailboxHealthTab from "./tabs/MailboxHealthTab";

type TabKey = "sequences" | "enrollments" | "suppressions" | "lists" | "analytics" | "mailbox";

const TABS: { key: TabKey; label: string }[] = [
  { key: "sequences",    label: "Sequences" },
  { key: "enrollments",  label: "Enrollments" },
  { key: "suppressions", label: "Suppressions" },
  { key: "lists",        label: "Lists" },
  { key: "analytics",    label: "Analytics" },
  { key: "mailbox",      label: "Mailbox Health" },
];

export default function BIMarketing() {
  const [tab, setTab] = useState<TabKey>("sequences");
  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">BI Marketing</h2>
        <div className="flex gap-2 flex-wrap" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={"px-3 py-1.5 rounded-md text-sm " + (tab === t.key ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "sequences"    && <SequencesTab />}
      {tab === "enrollments"  && <EnrollmentsTab />}
      {tab === "suppressions" && <SuppressionsTab />}
      {tab === "lists"        && <ListsTab />}
      {tab === "analytics"    && <AnalyticsTab />}
      {tab === "mailbox"      && <MailboxHealthTab />}
    </div>
  );
}
