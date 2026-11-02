// BF_PORTAL_CONTACT_RECORD_TABS_v272
// Andrew's layout for the contact record in both silos: an Analytics tab
// (stage history, AI summary, visitor journey) and a Timeline tab (all
// activity). Both tabs stay mounted so switching keeps a generated summary and
// never refetches. The last tab chosen is remembered for the session.
import { useState, type CSSProperties, type ReactNode } from "react";

export type ContactRecordTab = "analytics" | "timeline" | "contracts"; // BF_PORTAL_v864_ACTIVE_CONTRACTS
export const CONTACT_TAB_KEY = "boreal.contact.tab";

export function initialContactTab(read: () => string | null = () => sessionStorage.getItem(CONTACT_TAB_KEY)): ContactRecordTab {
  try {
    const v = read();
    return v === "analytics" ? "analytics" : v === "contracts" ? "contracts" : "timeline"; // BF_PORTAL_v864_ACTIVE_CONTRACTS
  } catch {
    return "timeline";
  }
}

// BF_PORTAL_v864_ACTIVE_CONTRACTS - analytics is optional (a company has none); contracts adds the Active Contracts tab.
export default function ContactRecordTabs({ analytics, timeline, contracts }: { analytics?: ReactNode; timeline: ReactNode; contracts?: ReactNode }) {
  const [chosen, setTab] = useState<ContactRecordTab>(() => initialContactTab());
  const tab: ContactRecordTab = (chosen === "contracts" && !contracts) || (chosen === "analytics" && analytics === undefined) ? "timeline" : chosen;
  const [contractsSeen, setContractsSeen] = useState(false);
  if (tab === "contracts" && !contractsSeen) setContractsSeen(true);
  const choose = (next: ContactRecordTab) => {
    setTab(next);
    try { sessionStorage.setItem(CONTACT_TAB_KEY, next); } catch { /* storage unavailable */ }
  };
  const button = (value: ContactRecordTab, text: string): CSSProperties => ({
    border: "none", background: "transparent", cursor: "pointer", padding: "10px 4px", marginRight: 20,
    fontSize: 14, fontWeight: 600, color: tab === value ? "var(--ui-text)" : "var(--ui-text-muted)",
    borderBottom: tab === value ? "2px solid var(--ui-accent-blue, #2563eb)" : "2px solid transparent",
  });
  return (
    <div data-testid="contact-record-tabs">
      <div role="tablist" aria-label="Contact record" style={{ display: "flex", borderBottom: "1px solid var(--ui-border-soft)", marginBottom: 4 }}>
        {analytics !== undefined ? <button type="button" role="tab" id="contact-tab-analytics" aria-selected={tab === "analytics"} aria-controls="contact-panel-analytics" onClick={() => choose("analytics")} style={button("analytics", "Analytics")}>Analytics</button> : null}
        <button type="button" role="tab" id="contact-tab-timeline" aria-selected={tab === "timeline"} aria-controls="contact-panel-timeline" onClick={() => choose("timeline")} style={button("timeline", "Timeline")}>Timeline</button>
        {contracts ? <button type="button" role="tab" id="contact-tab-contracts" aria-selected={tab === "contracts"} aria-controls="contact-panel-contracts" onClick={() => choose("contracts")} style={button("contracts", "Active Contracts")}>Active Contracts</button> : null}
      </div>
      {analytics !== undefined ? <div role="tabpanel" id="contact-panel-analytics" aria-labelledby="contact-tab-analytics" hidden={tab !== "analytics"} data-testid="contact-panel-analytics">{analytics}</div> : null}
      <div role="tabpanel" id="contact-panel-timeline" aria-labelledby="contact-tab-timeline" hidden={tab !== "timeline"} data-testid="contact-panel-timeline">{timeline}</div>
      {contracts ? <div role="tabpanel" id="contact-panel-contracts" aria-labelledby="contact-tab-contracts" hidden={tab !== "contracts"} data-testid="contact-panel-contracts">{contractsSeen ? contracts : null}</div> : null}
    </div>
  );
}
