// BF_PORTAL_CONTACT_RECORD_TABS_v272
// Andrew's layout for the contact record in both silos: an Analytics tab
// (stage history, AI summary, visitor journey) and a Timeline tab (all
// activity). Both tabs stay mounted so switching keeps a generated summary and
// never refetches. The last tab chosen is remembered for the session.
import { useState, type CSSProperties, type ReactNode } from "react";

export type ContactRecordTab = "analytics" | "timeline";
export const CONTACT_TAB_KEY = "boreal.contact.tab";

export function initialContactTab(read: () => string | null = () => sessionStorage.getItem(CONTACT_TAB_KEY)): ContactRecordTab {
  try {
    return read() === "analytics" ? "analytics" : "timeline";
  } catch {
    return "timeline";
  }
}

export default function ContactRecordTabs({ analytics, timeline }: { analytics: ReactNode; timeline: ReactNode }) {
  const [tab, setTab] = useState<ContactRecordTab>(() => initialContactTab());
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
        <button type="button" role="tab" id="contact-tab-analytics" aria-selected={tab === "analytics"} aria-controls="contact-panel-analytics" onClick={() => choose("analytics")} style={button("analytics", "Analytics")}>Analytics</button>
        <button type="button" role="tab" id="contact-tab-timeline" aria-selected={tab === "timeline"} aria-controls="contact-panel-timeline" onClick={() => choose("timeline")} style={button("timeline", "Timeline")}>Timeline</button>
      </div>
      <div role="tabpanel" id="contact-panel-analytics" aria-labelledby="contact-tab-analytics" hidden={tab !== "analytics"} data-testid="contact-panel-analytics">{analytics}</div>
      <div role="tabpanel" id="contact-panel-timeline" aria-labelledby="contact-tab-timeline" hidden={tab !== "timeline"} data-testid="contact-panel-timeline">{timeline}</div>
    </div>
  );
}

export function NoVisitorJourneyNotice() {
  return (
    <section style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }} data-testid="bi-visitor-journey-notice">
      <strong>Visitor journey</strong>
      <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 0 }}>
        Page-by-page browsing history is only recorded for visitors to boreal.financial. The Boreal Insurance website does not record it yet.
      </p>
    </section>
  );
}
